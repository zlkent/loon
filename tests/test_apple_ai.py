"""Static Loon syntax/scope checks, not Siri or QUIC device acceptance."""
from fnmatch import fnmatchcase
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
CONFIGS = ('Config/Loon.lcf', 'Config/Loon-HomeWG.lcf')
SIRI_RULES = [
    'DOMAIN-SUFFIX,guzzoni.apple.com,DIRECT',
    'DOMAIN-SUFFIX,siri.apple.com,DIRECT',
    'DOMAIN,dejavu.apple.com,DIRECT',
    'DOMAIN,sequoia.apple.com,DIRECT',
    'DOMAIN-SUFFIX,smoot.apple.com,DIRECT',
]
SIRI_PATTERNS = {
    'guzzoni.apple.com', '*.guzzoni.apple.com', 'siri.apple.com', '*.siri.apple.com',
    'dejavu.apple.com', 'sequoia.apple.com', 'smoot.apple.com', '*.smoot.apple.com',
}
AI_HOSTS = (
    'gspe1-ssl.ls.apple.com', 'apple-relay.apple.com', 'apple-relay.cloudflare.com',
    'apple-relay.fastly-edge.com', 'apple-relay.akamaized.net', 'cp4.cloudflare.com',
)


def sections(path):
    result = {}
    current = None
    for raw in (ROOT / path).read_text(encoding='utf-8').splitlines():
        line = raw.strip()
        if not line or line.startswith('#'):
            continue
        if line.startswith('[') and line.endswith(']'):
            current = line[1:-1]
            result[current] = []
        else:
            result[current].append(line)
    return result


class AppleAITests(unittest.TestCase):
    def test_explicit_local_rules_and_us_auto_policy(self):
        for config in CONFIGS:
            with self.subTest(config=config):
                data = sections(config)
                rules = data['Rule']
                expected = SIRI_RULES + [f'DOMAIN,{host},美国自动优选' for host in AI_HOSTS]
                # HomeWG's precise private LAN rule is intentionally still first.
                start = 1 if config.endswith('Loon-HomeWG.lcf') else 0
                self.assertEqual(rules[start:start + len(expected)], expected)
                self.assertEqual(len(rules), start + len(expected) + 3)
                self.assertEqual(rules[-1], 'FINAL,节点选择')
                self.assertTrue(any(line.startswith('美国自动优选 = url-test,美国节点,')
                                    for line in data['Proxy Group']))
                self.assertIn('OpenAI = select,美国节点选择,美国节点', data['Proxy Group'])

    def test_siri_real_ip_and_http_proxy_bypass_are_narrow(self):
        for config in CONFIGS:
            with self.subTest(config=config):
                general = dict((k.strip(), v.strip()) for k, v in
                               (line.split('=', 1) for line in sections(config)['General']))
                self.assertNotIn('always-real-ip', general)
                real = set(general.get('real-ip', '').split(','))
                self.assertEqual(real, SIRI_PATTERNS)
                skip = set(general['skip-proxy'].split(','))
                self.assertTrue(SIRI_PATTERNS <= skip)
                for host in AI_HOSTS + ('api.openai.com', 'www.apple.com'):
                    self.assertFalse(any(fnmatchcase(host, pattern) for pattern in real))
                    self.assertFalse(any(fnmatchcase(host, pattern) for pattern in skip))

    def test_no_quic_block_added_and_private_override_documented(self):
        for config in CONFIGS:
            with self.subTest(config=config):
                data = sections(config)
                self.assertFalse(any(line.startswith('disable-udp-ports')
                                     for line in data['General']))
                self.assertFalse(any('REJECT' in line for line in data['Rule']))
                self.assertFalse(any(line.startswith('block-quic') for line in data['General']))
        readme = (ROOT / 'README.md').read_text(encoding='utf-8')
        for phrase in ('real-ip', 'udp=true', 'block-quic=false', '美国自动优选',
                       '私人节点订阅', '不能覆盖'):
            self.assertIn(phrase, readme)


if __name__ == '__main__':
    unittest.main()
