import * as path from 'path';
import * as Mocha from 'mocha';
import { glob } from 'glob';

export function run(): Promise<void> {
	// Create the mocha test
	const mocha = new Mocha({
		ui: 'tdd',
		color: true
	});

	const testsRoot = path.resolve(__dirname, '..');

	return new Promise(async (c, e) => {
		try {
			const files: string[] = await glob('**/**.test.js', { cwd: testsRoot });

			files.forEach((f: string) => mocha.addFile(path.resolve(testsRoot, f)));

			mocha.run(failures => {
				if (failures > 0) {
					e(new Error(`${failures} tests failed.`));
				} else {
					c();
				}
			});
		} catch (err: any) {
			console.error(err);
			e(err);
		}
	});
}
