"""Derive the WG candidate from the maintained public base, never from private data."""
from __future__ import annotations

import argparse
import ipaddress
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://raw.githubusercontent.com/zlkent/loon/codex/wg-local-parameters/"
# Updating this release binding propagates through the existing complete subscription.
NODE_PARSER = "https://raw.githubusercontent.com/zlkent/loon/c374eb2b9f945c8f755aa710878a53756203e7a6/Plugin/HomeWGNodeParserPinned.lpx"
LAN = ipaddress.ip_network("192.168.1.0/24")


def once(text: str, old: str, new: str) -> str:
    if text.count(old) != 1:
        raise ValueError("Base layout changed; refusing an ambiguous WG transformation")
    return text.replace(old, new, 1)


def render() -> str:
    source = (ROOT / "Config/Loon.lcf").read_text(encoding="utf-8")
    source = once(source, "[General]\n", "[General]\ninclude-tun = 192.168.1.0/24\n")
    skip = next(line for line in source.splitlines() if line.startswith("skip-proxy = "))
    result = []
    for item in skip.split(" = ", 1)[1].split(","):
        item = item.strip()
        try:
            network = ipaddress.ip_network(item)
        except ValueError:
            result.append(item)
            continue
        if network == LAN or network.subnet_of(LAN):
            continue
        if LAN.subnet_of(network):
            result.extend(str(n) for n in network.address_exclude(LAN))
        else:
            result.append(item)
    source = once(source, skip, "skip-proxy = " + ",".join(result))
    source = once(source, "[Remote Proxy]\n", "[Remote Proxy]\n家庭WG订阅 = " + BASE +
                  "Probe/HomeWGSeed.txt,parser-enabled=true,parser-plugin=" + NODE_PARSER +
                  ",enabled=true\n")
    source = once(source, '全部节点 = NameRegex, FilterKey=".*"',
                  '全部节点 = NameRegex, FilterKey="^(?!家庭WG$).*"\n'
                  '# 订阅节点通过筛选动态加入策略，不直接使用订阅内节点名作静态引用。\n'
                  '家庭WG节点 = NameRegex, FilterKey="^家庭WG$"')
    source = once(source, "[Proxy Group]\n", "[Proxy Group]\n"
                  "# 外层可手动选 DIRECT/WG；网络脚本只切换内层，不覆盖手动选择。\n"
                  "家庭内网 = select,家庭自动,家庭WG节点,DIRECT\n"
                  "家庭自动 = select,家庭WG节点,DIRECT\n")
    source = once(source, "[Rule]\n", "[Rule]\n"
                  "# 优先于 LAN/ChinaMax；仅此家庭网段由家庭策略处理。\n"
                  "IP-CIDR,192.168.1.0/24,家庭内网,no-resolve\n")
    source = once(source, "[Plugin]\n", "[Plugin]\n" + NODE_PARSER +
                  ",enabled=true\n" + BASE +
                  "Plugin/HomeWGAuto.lpx,enabled=true\n")
    return ("# 家庭 WG 节点版 candidate；由 tools/generate_home_wg.py 派生，请勿手改。\n"
            "# 先备份并作为新配置导入；本地初始化见 docs/home-wg-node.md。\n" + source)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Check the public derivative without writing")
    args = parser.parse_args()
    target = ROOT / "Config/Loon-HomeWG.lcf"
    content = render()
    if args.check:
        if not target.exists() or target.read_text(encoding="utf-8") != content:
            raise SystemExit("WG candidate differs from the generated public base")
        print("WG candidate matches the maintained public base")
    else:
        target.write_text(content, encoding="utf-8", newline="\n")
        print("Generated Config/Loon-HomeWG.lcf (no private inputs)")


if __name__ == "__main__":
    main()
