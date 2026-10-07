"""Static checks only: these do not execute Loon or test real node failover."""
from pathlib import Path
import json
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
        self.assertEqual(self.groups.get('故障转移'),
                         ['fallback', '全部节点', 'interval=60', 'max-timeout=3000'])
        self.assertEqual(self.groups.get('自动优选'),
                         ['url-test', '全部节点', 'interval=60', 'tolerance=50'])
        self.assertEqual(self.groups['节点选择'],
                         ['select', '故障转移', '自动优选', '全部节点'])

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
        self.assertEqual(self.sections['Rule'], ['FINAL,节点选择'])
        for service in expected:
            if service in self.groups and service != 'Advertising':
                self.assertEqual(self.groups[service][1], '节点选择')

    def test_no_private_nodes_or_mitm(self):
        self.assertEqual(self.sections['Remote Proxy'], [])
        self.assertEqual(self.sections['Proxy'], [])
        for line in self.sections['MITM']:
            key, value = [part.strip() for part in line.split('=', 1)]
            if key in ('hostname', 'ca-p12', 'ca-passphrase'):
                self.assertEqual(value, '')


if __name__ == '__main__':
    unittest.main()
