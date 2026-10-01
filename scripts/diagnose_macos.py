#!/usr/bin/env python3
"""Read-only policy diagnostics for the exact candidate archives and a control app."""
import hashlib
import json
from pathlib import Path
import plistlib
import subprocess
import sys
import tempfile


def capture(*args):
    try:
        p = subprocess.run(args, capture_output=True, text=True, timeout=90)
        return {'exit': p.returncode, 'output': (p.stdout + p.stderr).strip()}
    except subprocess.TimeoutExpired:
        return {'timeout': True}


root, phase = Path(sys.argv[1]), sys.argv[2]
reports = {}
with tempfile.TemporaryDirectory(prefix='kaveriel-policy-') as temporary:
    stage = Path(temporary)
    control = stage / 'Control.app'
    (control / 'Contents/MacOS').mkdir(parents=True)
    (control / 'Contents/Resources').mkdir()
    (control / 'Contents/Info.plist').write_bytes(plistlib.dumps({
        'CFBundleExecutable': 'Control', 'CFBundleIdentifier': 'br.com.kaveriel.policycontrol',
        'CFBundleName': 'Control', 'CFBundlePackageType': 'APPL', 'CFBundleVersion': '1'}))
    code = stage / 'control.c'
    code.write_text('int main(void) { return 0; }\n')
    subprocess.run(['cc', str(code), '-o', str(control / 'Contents/MacOS/Control')], check=True)
    subprocess.run(['codesign', '--force', '--sign', '-', '--timestamp=none', str(control)], check=True)
    reports['control'] = capture('syspolicy_check', 'distribution', str(control))
    for platform in ['macos-arm64', 'macos-x64']:
        baseline = json.loads((root / ('validation-' + platform + '.json')).read_text())
        archive = root / baseline['output']
        assert hashlib.sha256(archive.read_bytes()).hexdigest() == baseline['sha256']
        target = stage / platform
        subprocess.run(['ditto', '-x', '-k', str(archive), str(target)], check=True)
        app = target / 'Kaveriel.app'
        check = capture('codesign', '--verify', '--deep', '--strict', '--verbose=2', str(app))
        assert check['exit'] == 0
        binaries = {}
        for path in app.rglob('*'):
            if not path.is_file():
                continue
            with path.open('rb') as stream:
                magic = stream.read(4)
            if magic in [b'\xcf\xfa\xed\xfe', b'\xce\xfa\xed\xfe', b'\xca\xfe\xba\xbe']:
                binaries[path.relative_to(app).as_posix()] = {
                    'libraries': capture('otool', '-L', str(path)),
                    'loadCommands': capture('otool', '-l', str(path))}
        reports[platform] = {'sha256': baseline['sha256'], 'integrity': check,
            'distribution': capture('syspolicy_check', 'distribution', str(app)),
            'binaries': binaries}
    reports['xquartzInstalled'] = Path('/opt/X11/lib/libX11.6.dylib').exists()
    reports['logs'] = capture('/usr/bin/log', 'show', '--last', '5m', '--style', 'compact',
        '--info', '--debug', '--predicate',
        'process == "XprotectService" OR process == "syspolicyd" OR subsystem == "com.apple.xprotect"')
    (root / ('policy-' + phase + '.json')).write_text(json.dumps(reports, indent=2) + '\n')
    for key in ['control', 'macos-arm64', 'macos-x64']:
        print(key, json.dumps(reports[key].get('distribution', reports[key])))
