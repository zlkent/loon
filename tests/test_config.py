"""Static checks only: these do not execute Loon or test real node failover."""
from pathlib import Path
import json
import fnmatch
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]


def read_sections():
    sections = {}
    current = None
    for raw in (ROOT / 'Config/Loon.lcf').read_text(encoding='utf-8-sig').splitlines():
        line = raw.strip()
        if not line or line.startswith('#'):
            continue
        if line.startswith('[') and line.endswith(']'):
            current = line[1:-1]
            if current in sections:
                raise ValueError(f'Duplicate section: {current}')
            sections[current] = []
        else:
            sections[current].append(line)
    return sections


class ConfigTests(unittest.TestCase):
    def setUp(self):
        self.sections = read_sections()
        self.groups = {}
        for line in self.sections['Proxy Group']:
            name, value = line.split('=', 1)
            name = name.strip()
            self.assertNotIn(name, self.groups)
            self.groups[name] = [part.strip() for part in value.split(',')]

    def test_automatic_policies_and_default(self):
        url = 'url=http://www.gstatic.com/generate_204'
        self.assertEqual(self.groups.get('故障转移'),
                         ['fallback', '全部节点', url, 'interval=60', 'max-timeout=3000'])
        self.assertEqual(self.groups.get('自动优选'),
                         ['url-test', '全部节点', url, 'interval=60', 'tolerance=50'])
        self.assertEqual(self.groups['节点选择'],
                         ['select', '自动优选', '故障转移', '美国节点选择', '全部节点'])

    def test_us_pool_and_service_boundaries(self):
        url = 'url=http://www.gstatic.com/generate_204'
        self.assertEqual(self.groups.get('美国自动优选'),
                         ['url-test', '美国节点', url, 'interval=60', 'tolerance=50'])
        self.assertEqual(self.groups.get('美国故障转移'),
                         ['fallback', '美国节点', url, 'interval=60', 'max-timeout=3000'])
        self.assertEqual(self.groups.get('美国节点选择'),
                         ['select', '美国自动优选', '美国故障转移', '美国节点'])
        for service in ('Google', 'OpenAI', 'Claude', 'Gemini'):
            self.assertEqual(self.groups[service], ['select', '美国节点选择', '美国节点'])
        # No path from the region-constrained services to all nodes or DIRECT.
        def leaves(name):
            if name not in self.groups:
                return {name}
            result = set()
            for child in self.groups[name][1:]:
                if '=' not in child:
                    result |= leaves(child)
            return result
        for service in ('Google', 'OpenAI', 'Claude', 'Gemini'):
            self.assertEqual(leaves(service), {'美国节点'})

    def test_us_name_filter(self):
        filters = dict(line.split('=', 1) for line in self.sections['Remote Filter'])
        filters = {k.strip(): v.strip() for k, v in filters.items()}
        self.assertIn('美国节点', filters, 'US node filter missing')
        self.assertEqual(filters['全部节点'], 'NameRegex, FilterKey=".*"')
        regex = filters['美国节点'].split('FilterKey=', 1)[1].strip().strip('"')
        for name in ('🇺🇸 示例 美国 01', '示例 美國 02', 'Example US 01',
                     'Example USA-01', 'example us01', 'Example United States 01'):
            self.assertIsNotNone(re.search(regex, name), name)
        for name in ('🇦🇷 示例 阿根廷 01', '🇦🇹 示例 奥地利 01',
                     '🇦🇺 Example Australia 01', 'Example AUS 01',
                     'Example Russia 01', 'Example usual 01',
                     '🇯🇵 示例 日本 01', '🇭🇰 示例 香港 01'):
            self.assertIsNone(re.search(regex, name), name)

    def test_references_and_no_cycles(self):
        filters = {line.split('=', 1)[0].strip() for line in self.sections['Remote Filter']}
        known = set(self.groups) | filters | {'DIRECT', 'REJECT'}

        def visit(name, stack):
            self.assertNotIn(name, stack, f'Policy cycle: {stack + [name]}')
            for target in self.groups[name][1:]:
                if '=' in target:
                    continue
                self.assertIn(target, known)
                if target in self.groups:
                    visit(target, stack + [name])

        for name in self.groups:
            visit(name, [])

    def test_routing_unchanged(self):
        expected = {name: name for name in
                    ('Google', 'Telegram', 'Twitter', 'GitHub', 'YouTube', 'OpenAI', 'Claude', 'Gemini')}
        expected.update({name: 'DIRECT' for name in ('WeChat', 'GaoDe', 'Apple', 'LAN', 'ChinaMax')})
        expected['Advertising'] = '广告拦截'
        catalog = json.loads((ROOT / 'docs/rule-catalog.json').read_text(encoding='utf-8-sig'))
        urls = {rule['url'] for rule in catalog['rules']}
        selected = {}
        for line in self.sections['Remote Rule']:
            url, *params = [part.strip() for part in line.split(',')]
            self.assertIn(url, urls)
            attrs = dict(part.split('=', 1) for part in params)
            self.assertEqual(attrs['enabled'], 'true')
            self.assertNotIn(attrs['tag'], selected)
            selected[attrs['tag']] = attrs['policy']
        self.assertEqual(selected, expected)
        order = list(selected)
        self.assertEqual(order[0], 'Advertising')
        self.assertEqual(order[-1], 'ChinaMax')
        for name in ('Gemini', 'YouTube'):
            self.assertLess(order.index(name), order.index('Google'))
        self.assertEqual(self.sections['Rule'], [
            'IP-CIDR,1.1.1.1/32,节点选择,no-resolve',
            'IP-CIDR,8.8.8.8/32,节点选择,no-resolve',
            'FINAL,节点选择',
        ])
        for service in expected:
            if service in self.groups and service != 'Advertising':
                target = '美国节点选择' if service in ('Google', 'OpenAI', 'Claude', 'Gemini') else '节点选择'
                self.assertEqual(self.groups[service][1], target)

    def test_no_private_nodes_or_mitm(self):
        self.assertEqual(self.sections['Remote Proxy'], [])
        self.assertEqual(self.sections['Proxy'], [])
        for line in self.sections['MITM']:
            key, value = [part.strip() for part in line.split('=', 1)]
            if key in ('hostname', 'ca-p12', 'ca-passphrase'):
                self.assertEqual(value, '')

    def test_default_doh_and_bootstrap_boundary(self):
        general = dict(line.split('=', 1) for line in self.sections['General'])
        general = {k.strip(): v.strip() for k, v in general.items()}
        self.assertEqual(general.get('doh-server'),
                         'https://1.1.1.1/dns-query,https://8.8.8.8/dns-query')
        self.assertNotIn('doq-server', general)
        self.assertNotIn('doh3-server', general)
        self.assertEqual(general['dns-server'], '223.5.5.5,119.29.29.29')
        self.assertNotIn('* =', '\n'.join(self.sections['Host']))
        self.assertNotIn('doh-server', '\n'.join(self.sections['Remote Proxy']))
        config = (ROOT / 'Config/Loon.lcf').read_text(encoding='utf-8')
        self.assertIn('server-dns="223.5.5.5,119.29.29.29"', config)

    def test_dns_mobile_controls_documented(self):
        readme = (ROOT / 'README.md').read_text(encoding='utf-8')
        config = (ROOT / 'Config/Loon.lcf').read_text(encoding='utf-8')
        for text in (readme, config):
            self.assertIn('DOH 流量模式', text)
            self.assertIn('Rule', text)
            self.assertIn('查询回落', text)
        self.assertIn('订阅更新无法替你', readme)

    def test_domestic_dns_examples_and_foreign_default(self):
        hosts = dict(line.split(' = ', 1) for line in self.sections['Host'])
        for domain in ('163.com', 'look.163.com', 'music.163.com',
                       'douyinvod.com', 'v95-zj-coldb.douyinvod.com',
                       'douyin.com', 'apple.com', 'www.apple.com',
                       'weixin.qq.com', 'amap.com', 'autonavi.com',
                       'taobao.com', 'bilibili.com', 'baidu.com'):
            matches = [v for k, v in hosts.items() if fnmatch.fnmatchcase(domain, k)]
            self.assertTrue(matches, domain)
            self.assertEqual(set(matches), {'server:223.5.5.5'}, domain)
        for domain in ('google.com', 'google.cn', 'youtube.com', 'github.com',
                       't.me', 'telegram.org', 'twitter.com', 'video.twimg.com',
                       'openai.com', 'claude.ai', 'gemini.google.com',
                       'unknown-video.example', 'evil163.com'):
            self.assertFalse(any(fnmatch.fnmatchcase(domain, k) for k in hosts), domain)

    def test_domestic_dns_map_valid_and_bounded(self):
        lines = self.sections['Host']
        self.assertGreater(len(lines), 1000)
        self.assertLess(len(lines), 15000)
        self.assertLess((ROOT / 'Config/Loon.lcf').stat().st_size, 1024 * 1024)
        hosts = dict(line.split(' = ', 1) for line in lines)
        self.assertEqual(len(hosts), len(lines))
        for domain, server in hosts.items():
            self.assertEqual(server, 'server:223.5.5.5')
            self.assertRegex(domain, r'^(?:\*\.)?(?:[a-z0-9-]+\.)+[a-z0-9-]+$')
            if domain.startswith('*.'):
                self.assertIn(domain[2:], hosts)


if __name__ == '__main__':
    unittest.main()
