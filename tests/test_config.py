"""Static checks only: these do not execute Loon or test real node failover."""
from pathlib import Path
import json
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
REGIONS = ('香港', '日本', '新加坡', '台湾', '美国')


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
                         ['select', '自动优选', '故障转移'] +
                         [f'{region}节点选择' for region in REGIONS] + ['全部节点'])

    def test_all_region_policy_boundaries(self):
        url = 'url=http://www.gstatic.com/generate_204'
        for region in REGIONS:
            with self.subTest(region=region):
                self.assertEqual(self.groups.get(f'{region}自动优选'),
                                 ['url-test', f'{region}节点', url, 'interval=60', 'tolerance=50'])
                self.assertEqual(self.groups.get(f'{region}故障转移'),
                                 ['fallback', f'{region}节点', url, 'interval=60', 'max-timeout=3000'])
                self.assertEqual(self.groups.get(f'{region}节点选择'),
                                 ['select', f'{region}自动优选', f'{region}故障转移', f'{region}节点'])
        for service in ('Telegram', 'Twitter', 'GitHub', 'YouTube'):
            self.assertEqual(self.groups[service], ['select', '节点选择'] +
                             [f'{region}节点选择' for region in REGIONS] + ['全部节点'])

    def test_region_name_filter_examples(self):
        positives = {
            '香港': ('🇭🇰 示例 香港 01', 'Example HK-01', 'Example Hong Kong 01', 'example hk01'),
            '日本': ('🇯🇵 示例 日本 01', 'Example JP-01', 'Example Japan 01', 'example jp01'),
            '新加坡': ('🇸🇬 示例 新加坡 01', '示例 狮城 01', '示例 獅城 01',
                        'Example SG-01', 'Example Singapore 01', 'example sg01'),
            '台湾': ('🇹🇼 示例 台湾 01', '示例 台灣 01', '示例 臺灣 01',
                     'Example TW-01', 'Example Taiwan 01', 'example tw01'),
            '美国': ('🇺🇸 示例 美国 01', '示例 美國 01', 'Example US-01',
                     'Example USA 01', 'Example United States 01'),
        }
        filters = {line.split('=', 1)[0].strip(): line.split('=', 1)[1].strip()
                   for line in self.sections['Remote Filter']}
        self.assertEqual(set(filters), {'全部节点'} | {f'{r}节点' for r in REGIONS})
        negatives = ('🇦🇷 示例 阿根廷 01', 'Example Australia 01', 'Example Russia 01',
                     'Example THK 01', 'Example JPG 01', 'Example SGL 01', 'Example Twitter 01')
        for region in REGIONS:
            self.assertIn(f'{region}节点', filters)
            regex = filters[f'{region}节点'].split('FilterKey=', 1)[1].strip().strip('"')
            for other, names in positives.items():
                for name in names:
                    with self.subTest(region=region, name=name):
                        self.assertEqual(re.search(regex, name) is not None, region == other)
            for name in negatives:
                with self.subTest(region=region, name=name):
                    self.assertIsNone(re.search(regex, name))

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
            'IP-CIDR,223.5.5.5/32,DIRECT,no-resolve',
            'IP-CIDR,1.12.12.12/32,DIRECT,no-resolve',
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
                         'https://223.5.5.5/dns-query,https://1.12.12.12/dns-query')
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
        self.assertIn('开启“查询回落”', readme)
        self.assertNotIn('关闭“查询回落”', readme)
        self.assertIn('不是严格的国内外 DNS 分离', readme)
        self.assertIn('私人节点订阅和 MITM 证书', readme)

    def test_domestic_dns_has_no_manual_coverage_dependency(self):
        self.assertEqual(self.sections['Host'], [])
        config = (ROOT / 'Config/Loon.lcf').read_text(encoding='utf-8')
        self.assertNotIn('BEGIN GENERATED DOMESTIC DNS', config)
        # Both DNS connections are explicitly direct even with mobile Rule mode.
        for ip in ('223.5.5.5', '1.12.12.12'):
            self.assertIn(f'IP-CIDR,{ip}/32,DIRECT,no-resolve', self.sections['Rule'])
        for ip in ('1.1.1.1', '8.8.8.8'):
            self.assertFalse(any(ip in line for line in self.sections['Rule']))

    def test_slim_configuration_and_no_new_plugins(self):
        self.assertLess((ROOT / 'Config/Loon.lcf').stat().st_size, 20 * 1024)
        for section in ('Rewrite', 'Script', 'Plugin'):
            self.assertEqual(self.sections[section], [])


if __name__ == '__main__':
    unittest.main()
