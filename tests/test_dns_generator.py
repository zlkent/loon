"""Archived DNS generator checks; not used by the current subscription."""
import importlib.util
import json
from pathlib import Path
import unittest
import subprocess
import sys

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

    def test_reproducible_archived_host_block(self):
        gen = self.load_generator()
        snapshot = json.loads((ROOT / 'docs/dns-domains.json').read_text(encoding='utf-8'))
        block = gen.render(snapshot)
        self.assertEqual(block, gen.render(snapshot))
        self.assertEqual(len(block.splitlines()) - 3, 10672)
        self.assertNotIn('* = server:', block)
        for source in snapshot['sources']:
            self.assertRegex(source['sha256'], r'^[a-f0-9]{64}$')
            self.assertIn(snapshot['revision'], source['url'])

    def test_archived_cli_cannot_rewrite_current_configuration(self):
        path = ROOT / 'Config/Loon.lcf'
        before = path.read_bytes()
        for args in ([], ['--check'], ['--refresh', '--check']):
            with self.subTest(args=args):
                result = subprocess.run([sys.executable, str(ROOT / 'tools/generate_dns.py'), *args],
                                        capture_output=True, text=True, timeout=10)
                self.assertEqual(result.returncode, 2)
                self.assertIn('Retired', result.stderr)
                self.assertNotIn('Traceback', result.stderr)
                self.assertEqual(path.read_bytes(), before)


if __name__ == '__main__':
    unittest.main()
