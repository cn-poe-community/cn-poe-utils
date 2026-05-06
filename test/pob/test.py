#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json
import os
import subprocess
import sys
from pathlib import Path


def load_config(config_path: str) -> dict:
    with open(config_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def get_package_version(project_root: str) -> str:
    package_json_path = os.path.join(project_root, 'package.json')
    with open(package_json_path, 'r', encoding='utf-8') as f:
        package_data = json.load(f)
    return package_data['version']


def patch_import_tab(pob_root: str, hostname: str, port: str) -> bool:
    import_tab_path = os.path.join(pob_root, 'Classes', 'ImportTab.lua')
    if not os.path.exists(import_tab_path):
        print(f"Error: File not found: {import_tab_path}")
        return False

    try:
        with open(import_tab_path, 'r', encoding='utf-8') as f:
            content = f.read()

        old_url = 'https://poe.game.qq.com/'
        new_url = f'http://{hostname}:{port}/'

        if new_url in content:
            print(f"Info: {import_tab_path} already patched with correct URL")
            return True

        if old_url not in content:
            print(f"Error: URL mismatch - neither old URL nor expected new URL found in {import_tab_path}")
            return False

        updated_content = content.replace(old_url, new_url)
        with open(import_tab_path, 'w', encoding='utf-8') as f:
            f.write(updated_content)
        print(f"Patched: {import_tab_path}")
        print(f"Replaced '{old_url}' with '{new_url}'")
        return True
    except Exception as e:
        print(f"Error patching ImporTab.lua: {e}")
        return False


def run_command(cmd: list, cwd: str, description: str) -> bool:
    if sys.platform == 'win32':
        cmd = [c + '.cmd' if c in ('pnpm', 'npm', 'yarn') else c for c in cmd]
    print(f"\n{'='*50}")
    print(f"{description}")
    print(f"Running: {' '.join(cmd)}")
    print(f"{'='*50}")
    result = subprocess.run(cmd, cwd=cwd)
    if result.returncode != 0:
        print(f"Error: {description} failed with return code {result.returncode}")
        return False
    return True


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    test_pob_dir = script_dir
    project_root = os.path.dirname(os.path.dirname(script_dir))
    config_path = os.path.join(test_pob_dir, 'config.json')

    config = load_config(config_path)
    pob_root = config['pobRoot']
    hostname = config['hostname']
    port = config['port']

    if not patch_import_tab(pob_root, hostname, port):
        sys.exit(1)

    pkg_version = get_package_version(project_root)
    tgz_name = f"cn-poe-utils-{pkg_version}.tgz"
    tgz_path = os.path.join(test_pob_dir, tgz_name)

    if not run_command(
        ['pnpm', 'build'],
        cwd=project_root,
        description="Build cn-poe-utils"
    ):
        sys.exit(1)

    if not run_command(
        ['pnpm', 'pack', '--pack-destination', './test/pob'],
        cwd=project_root,
        description="Pack cn-poe-utils"
    ):
        sys.exit(1)

    if not os.path.exists(tgz_path):
        print(f"Error: Expected tarball not found: {tgz_path}")
        sys.exit(1)

    if not run_command(
        ['bun', 'remove', 'cn-poe-utils'],
        cwd=test_pob_dir,
        description="Remove cn-poe-utils dependency"
    ):
        sys.exit(1)

    tgz_relative = f"./{tgz_name}"
    if not run_command(
        ['bun', 'add', tgz_relative],
        cwd=test_pob_dir,
        description="Add cn-poe-utils from tarball"
    ):
        sys.exit(1)

    os.remove(tgz_path)
    print(f"Removed tarball: {tgz_path}")

    print(f"\n{'='*50}")
    print("Starting service...")
    print(f"{'='*50}")
    try:
        result = subprocess.run(['bun', 'run', 'index.ts'], cwd=test_pob_dir)
        sys.exit(result.returncode)
    except KeyboardInterrupt:
        sys.exit(0)


if __name__ == '__main__':
    main()
