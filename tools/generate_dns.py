"""Generate the domestic Host block; default is offline, --refresh uses pinned URLs.

Upstream domain data: blackmatrix7/ios_rule_script (GPL-2.0).
See docs/dns/NOTICE.md. No private subscription or device data is read.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
SNAPSHOT = ROOT / 'docs/dns-domains.json'
CONFIG = ROOT / 'Config/Loon.lcf'
BEGIN = '# BEGIN GENERATED DOMESTIC DNS'
END = '# END GENERATED DOMESTIC DNS'


def parse_source(text, format_name):
    suffix, exact = [], []
    if format_name not in ('domain', 'loon'):
        raise ValueError(f'Unknown source format: {format_name}')
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith('#'):
            continue
        if format_name == 'domain':
            (suffix if line.startswith('.') else exact).append(line.lstrip('.'))
        else:
            parts = line.split(',')
            if parts[0] in ('DOMAIN', 'DOMAIN-SUFFIX'):
                if len(parts) != 2:
                    raise ValueError(f'Invalid domain rule: {line}')
                (suffix if parts[0] == 'DOMAIN-SUFFIX' else exact).append(parts[1])
    return suffix, exact


def normalize(suffix, exact):
    pattern = r'[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?'
    def checked(values):
        result = set()
        for raw in values:
            domain = raw.lower()
            if len(domain) > 253 or not re.fullmatch(pattern + r'(?:\.' + pattern + r')+', domain):
                raise ValueError(f'Invalid domain: {raw}')
            result.add(domain)
        return result
    suffix, exact = checked(suffix), checked(exact)
    def covered(domain):
        labels = domain.split('.')
        return any('.'.join(labels[i:]) in suffix for i in range(1, len(labels)))
    # A suffix parent already covers its own root and all descendants.
    return (sorted(d for d in suffix if not covered(d)),
            sorted(d for d in exact if d not in suffix and not covered(d)))


def render(snapshot):
    suffix, exact = normalize(snapshot['suffix'], snapshot['exact'])
    lines = [BEGIN, '# 数据来源与覆盖边界见 docs/dns/NOTICE.md；勿手工修改此块。']
    for domain in suffix:
        lines += [f'{domain} = server:223.5.5.5', f'*.{domain} = server:223.5.5.5']
    lines += [f'{domain} = server:223.5.5.5' for domain in exact]
    return '\n'.join(lines + [END])


def refresh(snapshot):
    suffix, exact = [], []
    for source in snapshot['sources']:
        if snapshot['revision'] not in source['url']:
            raise ValueError('Source must be pinned to the declared revision')
        body = urllib.request.urlopen(source['url'], timeout=45).read()
        digest = hashlib.sha256(body).hexdigest()
        if digest != source['sha256']:
            raise ValueError(f"Source hash mismatch: {source['url']}")
        s, e = parse_source(body.decode('utf-8-sig'), source['format'])
        suffix.extend(s)
        exact.extend(e)
    snapshot['suffix'], snapshot['exact'] = normalize(suffix, exact)
    return snapshot


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Check without writing')
    parser.add_argument('--refresh', action='store_true', help='Fetch and verify pinned source hashes')
    args = parser.parse_args()
    snapshot = json.loads(SNAPSHOT.read_text(encoding='utf-8'))
    if args.refresh:
        snapshot = refresh(snapshot)
    text = CONFIG.read_text(encoding='utf-8')
    start, end = text.index(BEGIN), text.index(END) + len(END)
    generated = text[:start] + render(snapshot) + text[end:]
    if args.check:
        if generated != text:
            parser.exit(1, 'Generated DNS block is stale\n')
    else:
        CONFIG.write_text(generated, encoding='utf-8', newline='\n')
        if args.refresh:
            SNAPSHOT.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + '\n',
                                encoding='utf-8', newline='\n')
    print(f"DNS: {len(snapshot['suffix'])} suffixes, {len(snapshot['exact'])} exact domains")


if __name__ == '__main__':
    main()
