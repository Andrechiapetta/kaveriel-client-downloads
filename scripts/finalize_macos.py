#!/usr/bin/env python3
"""Seal the complete player app on macOS; preserve the authenticated game seed."""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import platform
import plistlib
import stat
import subprocess
import tempfile
import zipfile


def sha256(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def verify_seed(app, target):
    resources = app / 'Contents/Resources'
    raw = resources / (target + '.json')
    manifest = json.loads(raw.read_bytes())
    assert manifest['platform'] == target and manifest['version'] == '1.1.0'
    assert manifest['schema'] == 1 and manifest['channel'] == 'stable' and manifest['sequence'] == 1
    payload = resources / 'payload'
    inventory = {}
    for item in manifest['files']:
        relative = PurePosixPath(item['path'])
        assert not relative.is_absolute() and '..' not in relative.parts
        path = payload / relative
        assert path.is_file() and not path.is_symlink()
        assert path.stat().st_size == item['size'] and sha256(path) == item['sha256']
        assert item['path'] not in inventory
        inventory[item['path']] = item['sha256']
    actual = {p.relative_to(payload).as_posix() for p in payload.rglob('*') if p.is_file()}
    assert actual == set(inventory)
    assert not any(p.is_symlink() for p in payload.rglob('*'))
    return {'files': len(inventory), 'manifestSha256': sha256(raw),
            'signatureSha256': sha256(resources / (target + '.sig')), 'payload': inventory}


def capture(*command):
    result = subprocess.run(command, capture_output=True, text=True)
    return {'exit': result.returncode, 'output': (result.stdout + result.stderr).strip()}


def finalize(source, expected_sha, target, output):
    if platform.system() != 'Darwin':
        raise ValueError('Finalize and verify the .app on macOS using Apple codesign and ditto')
    if sha256(source) != expected_sha:
        raise ValueError('Input archive does not match the reviewed release SHA-256')
    output.mkdir(parents=True, exist_ok=True)
    destination = output / ('Kaveriel-1.1.0-' + target + '-r2.zip')
    if destination.exists():
        raise ValueError('Choose an empty output destination')
    with tempfile.TemporaryDirectory(prefix='kaveriel-mac-package-') as temporary:
        stage = Path(temporary)
        with zipfile.ZipFile(source) as archive:
            members = archive.infolist()
            assert len(members) < 10000 and sum(item.file_size for item in members) < 400 * 1024 * 1024
            assert len({item.filename for item in members}) == len(members)
            for item in members:
                relative = PurePosixPath(item.filename)
                assert not relative.is_absolute() and '..' not in relative.parts and '\\' not in item.filename
                assert relative.parts[0] == 'Kaveriel.app' and not stat.S_ISLNK(item.external_attr >> 16)
                path = stage / relative
                if item.is_dir():
                    path.mkdir(parents=True, exist_ok=True)
                    continue
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(archive.read(item))
                path.chmod(0o755 if item.external_attr >> 16 & 0o111 else 0o644)
        app = stage / 'Kaveriel.app'
        info = plistlib.loads((app / 'Contents/Info.plist').read_bytes())
        assert info['CFBundleExecutable'] == 'Kaveriel' and info['CFBundleIdentifier'] == 'br.com.kaveriel.nativeplayer'
        original = verify_seed(app, target)
        before = capture('/usr/bin/codesign', '--verify', '--deep', '--strict', '--verbose=2', str(app))
        # The engine is already signed and is inside the authenticated payload.
        # Never re-sign it here or use --deep when signing: that would alter its hash.
        subprocess.run(['/usr/bin/codesign', '--force', '--sign', '-', '--timestamp=none',
                        '--identifier', info['CFBundleIdentifier'], str(app)], check=True)
        verified = capture('/usr/bin/codesign', '--verify', '--deep', '--strict', '--verbose=2', str(app))
        if verified['exit'] != 0:
            raise RuntimeError(verified['output'])
        assert (app / 'Contents/_CodeSignature/CodeResources').is_file()
        assert verify_seed(app, target) == original
        identity = capture('/usr/bin/codesign', '--display', '--verbose=4', str(app))
        # Ad-hoc integrity is not Developer ID/notarization. Record this assessment
        # without misrepresenting an expected Gatekeeper policy rejection as success.
        gatekeeper = capture('/usr/sbin/spctl', '--assess', '--type', 'execute', '--verbose=4', str(app))
        subprocess.run(['/usr/bin/ditto', '-c', '-k', '--sequesterRsrc', '--keepParent',
                        str(app), str(destination.resolve())], check=True)
        reopened = stage / 'reopened'
        subprocess.run(['/usr/bin/ditto', '-x', '-k', str(destination.resolve()), str(reopened)], check=True)
        final_app = reopened / 'Kaveriel.app'
        roundtrip = capture('/usr/bin/codesign', '--verify', '--deep', '--strict', '--verbose=2', str(final_app))
        if roundtrip['exit'] != 0:
            raise RuntimeError(roundtrip['output'])
        assert verify_seed(final_app, target) == original
        report = {'platform': target, 'inputSha256': expected_sha,
                  'output': destination.name, 'bytes': destination.stat().st_size,
                  'sha256': sha256(destination), 'beforeBundleVerification': before,
                  'afterBundleVerification': verified, 'archiveRoundtripVerification': roundtrip,
                  'identity': identity, 'gatekeeperAssessment': gatekeeper,
                  'developerIdSigned': False, 'notarized': False,
                  'gameSeedUnchanged': True, 'payloadFiles': original['files'],
                  'manifestSha256': original['manifestSha256']}
        (output / ('validation-' + target + '.json')).write_text(json.dumps(report, indent=2) + '\n')
        print(json.dumps({key: report[key] for key in ('platform', 'output', 'bytes', 'sha256', 'gameSeedUnchanged')}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', required=True, type=Path)
    parser.add_argument('--sha256', required=True)
    parser.add_argument('--platform', required=True, choices=('macos-arm64', 'macos-x64'))
    parser.add_argument('--output', required=True, type=Path)
    arguments = parser.parse_args()
    finalize(arguments.input, arguments.sha256, arguments.platform, arguments.output)
