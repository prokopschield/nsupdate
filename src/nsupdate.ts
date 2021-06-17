#!/usr/bin/env node

import { read } from 'doge-json';
import fetch from 'node-fetch';
import fs from 'fs';
import run from 'nslibmgr/lib/run';
import path from 'path';
import semver from 'semver';

async function get_latest_version (pkg: string) {
	return fetch(`https://api.npms.io/v2/package/${pkg}`)
	.then(res => res.json())
	.then(res => res?.collected?.metadata?.version)
}

async function nsupdate () {
	try {
		const { dependencies: yarn_packages } = read(`/usr/local/share/.config/yarn/global/package.json`);
		let yarn = path.resolve(__dirname, '..', 'node_modules', '.bin', 'yarn');
		if (!fs.existsSync(yarn)) yarn = path.resolve(__dirname, '..', '..', 'yarn', 'bin', 'yarn');
		if (!fs.existsSync(yarn)) yarn = 'yarn';
		for (const pkg of [
			'n',
			'nsupdate',
			'yarn',
			...process.argv.slice(2),
		]) {
			if (!yarn_packages[pkg]) await run(`${yarn} global add ${pkg}`).then(success => success || (
				console.log(`Failed to install ${pkg}`),
				process.exit(0)
			));
		}
		await run('sudo n -p lts');
		for (const [ pkg, ver ] of Object.entries(yarn_packages)) {
			const remote_version = await get_latest_version(pkg);
			if (semver.compare(semver.coerce(`${ver}`) || '0.0.0', remote_version || '0.0.0') === -1) {
				console.log(`${pkg}: You have ${ver}, installing ${remote_version}`);
				await run(`${yarn} global add ${pkg}`);
			}
		}
		try {
			const npm_packages = await fs.promises.readdir('/usr/local/lib/node_modules');
			for (const pkg of npm_packages) {
				await run(`${yarn} global add ${pkg}`)
				.then(success => success && run(`sudo npm r -g ${pkg}`))
				.then(success => success || (
					(fs.existsSync(yarn))
					? (
						run(`${yarn} global add ${pkg}`)
						.then(() => run(`npm r -g ${pkg}`))
					) : run(`npm i -g ${pkg}`)
				))
			}
		} catch (error) {
			console.log(`Could not detect any npm packages.`);
		}
		console.log(`Updated all packages.`);
	} catch (error) {
		if (process.platform !== 'linux') {
			console.log('This program is only available for GNU/Linux.');
		} else {
			console.log(error);
		}
	}
}

nsupdate();
