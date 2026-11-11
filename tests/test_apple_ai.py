"""Static Loon syntax/scope checks, not Siri or QUIC device acceptance."""
from fnmatch import fnmatchcase
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
CONFIGS = ('Config/Loon.lcf', 'Config/Loon-HomeWG.lcf')
DIRECT_RULES = [
    'DOMAIN,dejavu.apple.com,DIRECT',
    'DOMAIN,sequoia.apple.com,DIRECT',
]
DIRECT_PATTERNS = {'dejavu.apple.com', 'sequoia.apple.com'}
AI_SUFFIXES = (
    'guzzoni.apple.com', 'smoot.apple.com', 'ls.apple.com', 'gspel-ssl.ls.apple.com',
    'gateway.icloud.com', 'mask-api.icloud.com', 'mask-h2.icloud.com', 'mask.icloud.com',
    'mask-api.fe.apple-dns.net', 'mask-t.apple-dns.net', 'mask.apple-dns.net',
    'apple-relay.mask.apple-dns.net', 'apple-relay.apple.com', 'apple-relay.cloudflare.com',
    'apple-relay.fastly-edge.com', 'cp4.cloudflare.com', 'apps.mzstatic.com',
    'apple-relay.akamaized.net',
)
PROXY_HOSTS = AI_SUFFIXES + (
    'siri.apple.com', 'foo.siri.apple.com', 'gspe1-ssl.ls.apple.com',
    'foo.guzzoni.apple.com', 'foo.smoot.apple.com', 'my-siri.example.com',
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
    def test_explicit_local_rules_and_japan_only_service_group(self):
        for config in CONFIGS:
            with self.subTest(config=config):
                data = sections(config)
                rules = data['Rule']
                expected = DIRECT_RULES + [f'DOMAIN-SUFFIX,{host},Siri AI' for host in AI_SUFFIXES]
                expected += ['DOMAIN-KEYWORD,siri,Siri AI']
                # HomeWG's precise private LAN rule is intentionally still first.
                start = 1 if config.endswith('Loon-HomeWG.lcf') else 0
                self.assertEqual(rules[start:start + len(expected)], expected)
                self.assertEqual(len(rules), start + len(expected) + 3)
                self.assertEqual(rules[-1], 'FINAL,节点选择')
                self.assertIn('Siri AI = select,日本自动优选,日本故障转移,日本节点',
                              data['Proxy Group'])
                groups = {k.strip(): [v.strip() for v in vs.split(',')] for k, vs in
                          (line.split('=', 1) for line in data['Proxy Group'])}
                def leaves(name):
                    if name not in groups:
                        return {name}
                    return set().union(*(leaves(child) for child in groups[name][1:]
                                         if '=' not in child))
                self.assertEqual(leaves('Siri AI'), {'日本节点'})
                for service in ('OpenAI', 'Google', 'Claude', 'Gemini'):
                    self.assertEqual(leaves(service), {'美国节点'})

    def test_proxied_siri_has_no_real_ip_or_http_proxy_bypass_conflict(self):
        for config in CONFIGS:
            with self.subTest(config=config):
                general = dict((k.strip(), v.strip()) for k, v in
                               (line.split('=', 1) for line in sections(config)['General']))
                self.assertNotIn('always-real-ip', general)
                real = set(general.get('real-ip', '').split(','))
                self.assertEqual(real, DIRECT_PATTERNS)
                skip = set(general['skip-proxy'].split(','))
                self.assertTrue(DIRECT_PATTERNS <= skip)
                for host in PROXY_HOSTS + ('api.openai.com', 'www.apple.com'):
                    self.assertFalse(any(fnmatchcase(host, pattern) for pattern in real))
                    self.assertFalse(any(fnmatchcase(host, pattern) for pattern in skip))

    def test_domain_coverage_and_no_residual_us_or_direct_override(self):
        for config in CONFIGS:
            with self.subTest(config=config):
                data = sections(config)
                def match(host):
                    for rule in data['Rule']:
                        kind, value, policy, *_ = rule.split(',') + ['']
                        if ((kind == 'DOMAIN' and host == value) or
                            (kind == 'DOMAIN-SUFFIX' and
                             (host == value or host.endswith('.' + value))) or
                            (kind == 'DOMAIN-KEYWORD' and value in host)):
                            return policy
                    return None
                for host in PROXY_HOSTS:
                    self.assertEqual(match(host), 'Siri AI', host)
                for host in DIRECT_PATTERNS:
                    self.assertEqual(match(host), 'DIRECT', host)
                for host in ('api.openai.com', 'www.apple.com', 'cloudflare.com'):
                    self.assertIsNone(match(host), host)

    def test_no_quic_block_added_and_private_override_documented(self):
        for config in CONFIGS:
            with self.subTest(config=config):
                data = sections(config)
                self.assertFalse(any(line.startswith('disable-udp-ports')
                                     for line in data['General']))
                self.assertFalse(any('REJECT' in line for line in data['Rule']))
                self.assertFalse(any(line.startswith('block-quic') for line in data['General']))
        readme = (ROOT / 'README.md').read_text(encoding='utf-8')
        for phrase in ('real-ip', 'udp=true', 'block-quic=false', 'Siri AI',
                       '日本自动优选', '私人节点订阅', '不能覆盖', 'DOMAIN-KEYWORD,siri'):
            self.assertIn(phrase, readme)


if __name__ == '__main__':
    unittest.main()
