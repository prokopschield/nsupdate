#!/usr/bin/env node

import { read } from 'doge-json';
import fs from 'fs';
import { manifest } from 'pacote';
import path from 'path';
import semver from 'semver';
import logger from './logger';
import run from './run';

async function get_latest_version(pkg: string) {
	return (await manifest(pkg)).version;
}

async function nsupdate() {
	try {
		const mode =
			process.getuid() && fs.existsSync('package.json') ? '' : 'global';

		logger.info(`Running in ${mode || 'normal'} mode`);
		const pkg_f = mode
			? '/usr/local/share/.config/yarn/global/package.json'
			: 'package.json';
		const pkg = read(pkg_f) || {};
		const dependencies = pkg.dependencies || {};

		let yarn = path.resolve(
			__dirname,
			'..',
			'node_modules',
			'.bin',
			'yarn'
		);
		if (!fs.existsSync(yarn))
			yarn = path.resolve(__dirname, '..', '..', 'yarn', 'bin', 'yarn');
		if (!fs.existsSync(yarn)) yarn = 'yarn';

		let sudo =
			(mode &&
				process.getuid() &&
				fs.existsSync('/bin/sudo') &&
				'sudo ') ||
			'';

		for (const pkg of [
			...(mode ? ['n', 'nsupdate', 'yarn'] : []),
			...process.argv.slice(2),
		]) {
			if (!dependencies[pkg]) {
				if (await run(`${sudo} ${yarn} ${mode} add ${pkg}`)) {
					logger.success(`Installed ${pkg} successfully.`);
				} else {
					logger.warn(`Errors while installing ${pkg}.`);
				}
			}
		}

		if (mode) {
			await run(`${sudo} n -p 14`);
		}

		logger.info(`Downloading package manifests!`);
		const versions: [string, string, string][] = await Promise.all(
			Object.entries(dependencies).map(async ([pkg, ver]) => [
				pkg,
				`${ver}`,
				await get_latest_version(`${pkg}@${ver}`),
			])
		);
		logger.info(`Finished downloading package manifests!`);

		for (const [pkg, ver, nver] of versions) {
			logger.info(`Checking if ${pkg}@${ver} is up to date...`);
			if (
				semver.compare(
					semver.coerce(`${ver}`) || '0.0.0',
					nver || '0.0.0'
				) === -1
			) {
				logger.info(`${pkg}: You have ${ver}, installing ${nver}`);
				if (await run(`${sudo} ${yarn} ${mode} add ${pkg}@^${nver}`)) {
					logger.success(`Installed ${pkg} successfully.`);
				} else {
					logger.warn(`Errors while installing ${pkg}.`);
				}
			}
		}

		if (mode) {
			try {
				const npm_packages = await fs.promises.readdir(
					'/usr/local/lib/node_modules'
				);

				for (const pkg of npm_packages) {
					if (pkg[0] === '@' && !pkg.includes('/')) {
						npm_packages.splice(pkg.indexOf(pkg), 1);
						npm_packages.push(
							...(
								await fs.promises.readdir(
									`/usr/local/lib/node_modules/${pkg}`
								)
							).map((a) => `${pkg}/${a}`)
						);
					}
				}

				for (const pkg of npm_packages) {
					if (['corepack', 'npm'].includes(pkg)) {
						logger.warn(`Skipping ${pkg}.`);
					} else {
						logger.info(`Attempting to convert ${pkg}...`);
						if (await run(`${yarn} ${mode} add ${pkg}`)) {
							logger.info(`Removing ${pkg} from npm...`);
							if (await run(`${sudo} npm r -g ${pkg}`)) {
								logger.success(`Removed ${pkg} from npm!`);
							} else {
								logger.warn(
									`Error while removing ${pkg} from npm!`
								);
							}
							if (await run(`${yarn} ${mode} add ${pkg}`)) {
								logger.success(`Installed ${pkg} sucessfully!`);
							} else {
								logger.error(`Failed to install ${pkg}.`);
							}
						} else {
							logger.error(`Could not install ${pkg}!`);
						}
					}
				}
			} catch (error) {
				console.log(`Could not detect any npm packages.`);
				console.error(error);
			}
		}
		logger.info(`Done updating packages.`);
	} catch (error) {
		if (process.platform !== 'linux') {
			logger.error('This program is only available for GNU/Linux.');
		} else {
			if (
				(error && typeof error === 'object') ||
				typeof error === 'string'
			) {
				logger.error(
					error && typeof error === 'object' ? error : `${error}`
				);
			}
		}
	}
}

nsupdate();
