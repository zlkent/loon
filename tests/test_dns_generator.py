"""Offline generator checks; not a Loon runtime emulation."""
import importlib.util
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class GeneratorTests(unittest.TestCase):
    def load_generator(self):
        path = ROOT / 'tools/generate_dns.py'
        self.assertTrue(path.is_file(), 'DNS generator missing')
        spec = importlib.util.spec_from_file_location('generate_dns', path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module

    def test_normalization_and_invalid_input(self):
        gen = self.load_generator()
        self.assertEqual(gen.normalize(['a.com', 'a.com', 'b.a.com'],
                                       ['x.a.com', 'exact.net']),
                         (['a.com'], ['exact.net']))
        for invalid in ('*', '*.com', 'cn', 'x.com = server:8.8.8.8',
                        'a..com', '-bad.com', 'bad-.com', 'https://a.com'):
            with self.subTest(invalid=invalid), self.assertRaises(ValueError):
                gen.normalize([invalid], [])

    def test_source_formats_preserve_exact_and_suffix(self):
        gen = self.load_generator()
        self.assertEqual(gen.parse_source('# ignored\n.a.com\nexact.net\n', 'domain'),
                         (['a.com'], ['exact.net']))
        self.assertEqual(gen.parse_source('DOMAIN-SUFFIX,a.com\nDOMAIN,exact.net\n'
                                         'IP-CIDR,1.2.3.0/24\n', 'loon'),
                         (['a.com'], ['exact.net']))

    def test_reproducible_host_block(self):
        gen = self.load_generator()
        snapshot = json.loads((ROOT / 'docs/dns-domains.json').read_text(encoding='utf-8'))
        block = gen.render(snapshot)
        config = (ROOT / 'Config/Loon.lcf').read_text(encoding='utf-8')
        self.assertIn(block, config)
        self.assertEqual(block, gen.render(snapshot))
        self.assertNotIn('* = server:', block)
        for source in snapshot['sources']:
            self.assertRegex(source['sha256'], r'^[a-f0-9]{64}$')
            self.assertIn(snapshot['revision'], source['url'])


if __name__ == '__main__':
    unittest.main()
