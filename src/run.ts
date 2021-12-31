import { exec } from 'child_process';
import logger from './logger';

/**
 * Executes shell command
 *
 * @param {string} cmd shell command
 * @returns {Promise<boolean>} Were there no errors?
 */
export function run(cmd: string): Promise<boolean> {
	return new Promise((resolve) => {
		const child = exec(cmd, (error, _stdout, stderr) =>
			resolve(!stderr && !error)
		);
		if (child.stdout)
			child.stdout.on('data', (chunk: Buffer) =>
				logger.info(chunk.toString().trim())
			);
		if (process.stderr && child.stderr)
			child.stderr.on('data', (chunk: Buffer) =>
				logger.error(chunk.toString().trim())
			);
	});
}

export default run;
module.exports = run;

Object.assign(run, {
	default: run,
	run,
});
