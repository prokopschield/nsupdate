import { createLogger } from '@prokopschield/lvksh-logger';
import chalk from 'chalk';

const logger = createLogger(
	{
		info: {
			label: 'INFO',
		},
		success: {
			label: chalk.hex('007700')`SUCCESS`,
		},
		warn: {
			label: chalk.hex('ff8800')`WARNING`,
		},
		error: {
			label: chalk.hex('880000')`ERROR`,
		},
	},
	{
		padding: 'APPEND',
		divider: ' ',
	}
);

export default logger;
