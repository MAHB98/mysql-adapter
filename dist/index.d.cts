import { Adapter } from '@auth/core/adapters';
import { Pool } from 'mysql2/promise';

declare const mapExpiresAt: (account: any) => any;
declare const mysqlAdapter: (client: Pool) => Adapter;

export { mysqlAdapter as default, mapExpiresAt };
