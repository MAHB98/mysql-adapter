export const mapExpiresAt = (account) => {
    const expires_at = parseInt(account.expires_at);
    return {
        ...account,
        expires_at,
    };
};
const mysqlAdapter = (client) => {
    return {
        async createVerificationToken(verificationToken) {
            const { identifier, expires, token } = verificationToken;
            const sql = `
        INSERT INTO verification_token ( identifier, expires, token ) 
        VALUES (?, ?, ?)
        `;
            await client.query(sql, [identifier, expires, token]);
            return verificationToken;
        },
        async useVerificationToken({ identifier, token, }) {
            const sql = `delete from verification_token
      where identifier = ? and token = ?
      `;
            const expires = new Date();
            try {
                const [result] = (await client.query(sql, [
                    identifier,
                    token,
                ]));
                if (result.affectedRows) {
                    return { expires, identifier, token };
                }
                else
                    return null;
            }
            catch {
                return null;
            }
        },
        async createUser(user) {
            const { name, email, emailVerified, image } = user;
            const sql = `
        INSERT INTO users (name, email, emailVerified, image) 
        VALUES (?, ?, ?, ?) 
        `;
            const [result] = (await client.query(sql, [
                name,
                email,
                emailVerified,
                image,
            ]));
            const [result1] = await client.query("select * from users where id=?", [
                result.insertId,
            ]);
            const [reResult1] = result1;
            return reResult1;
        },
        async getUser(id) {
            const sql = `select * from users where id = ?`;
            try {
                const [result] = await client.query(sql, [id]);
                const reResult = result;
                return reResult ? reResult[0] : null;
            }
            catch (e) {
                return null;
            }
        },
        async getUserByEmail(email) {
            const sql = `select * from users where email = ?`;
            const [result] = await client.query(sql, [email]);
            const reResult = result;
            return reResult ? reResult[0] : null;
        },
        async getUserByAccount({ providerAccountId, provider, }) {
            const sql = `
          select * from users u join accounts a on u.id = a.userId
          where 
          a.provider = ? 
          and 
          a.providerAccountId = ?`;
            const [result] = await client.query(sql, [provider, providerAccountId]);
            const reResult = result;
            return reResult ? reResult[0] : null;
        },
        async updateUser(user) {
            const fetchSql = `select * from users where id = ?`;
            const [query1] = await client.query(fetchSql, [user.id]);
            const [oldUser] = query1;
            const newUser = {
                ...oldUser,
                ...user,
            };
            const { id, name, email, emailVerified, image } = newUser;
            const updateSql = `
        UPDATE users set
        name =?, email = ?, emailVerified = ?, image = ?
        where id = ?
        
      `;
            const [query2] = (await client.query(updateSql, [
                name,
                email,
                emailVerified,
                image,
                id,
            ]));
            if (query2.affectedRows)
                return newUser;
            else
                throw new Error("nothing find ");
        },
        async linkAccount(account) {
            const sql = `
      insert into accounts 
      (
        userId, 
        provider, 
        type, 
        providerAccountId, 
        access_token,
        expires_at,
        refresh_token,
        id_token,
        scope,
        session_state,
        token_type
      )
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
            const params = [
                account.userId,
                account.provider,
                account.type,
                account.providerAccountId,
                account.access_token,
                account.expires_at,
                account.refresh_token,
                account.id_token,
                account.scope,
                account.session_state,
                account.token_type,
            ];
            const [result] = (await client.query(sql, params));
            return result.insertId ? mapExpiresAt(account) : null;
        },
        async createSession({ sessionToken, userId, expires }) {
            if (userId === undefined) {
                throw Error(`userId is undef in createSession`);
            }
            const sql = `insert into sessions (userId, expires, sessionToken)
      values (?, ?, ?)
    `;
            const [result] = (await client.query(sql, [
                userId,
                expires,
                sessionToken,
            ]));
            if (result.insertId)
                return { sessionToken, userId, expires };
            else
                throw new Error("nothing created ");
        },
        async getSessionAndUser(sessionToken) {
            if (sessionToken === undefined) {
                return null;
            }
            const [result1] = await client.query(`select * from sessions where sessionToken = ?`, [sessionToken]);
            const [oldUser] = result1;
            if (!oldUser) {
                return null;
            }
            const [result2] = await client.query("select * from users where id = ?", [
                oldUser.userId,
            ]);
            const [newUser] = result2;
            if (!newUser) {
                return null;
            }
            return {
                session: oldUser,
                user: newUser,
            };
        },
        async updateSession(session) {
            const { sessionToken } = session;
            const [result1] = await client.query(`select * from sessions where sessionToken = ?`, [sessionToken]);
            const [originalSession] = result1;
            if (!originalSession) {
                return null;
            }
            const newSession = {
                ...originalSession,
                ...session,
            };
            const sql = `
        UPDATE sessions set
        expires = ?
        where sessionToken = ?
        `;
            const [result] = (await client.query(sql, [
                newSession.expires,
                newSession.sessionToken,
            ]));
            return result.affectedRows ? newSession : null;
        },
        async deleteSession(sessionToken) {
            const sql = `delete from sessions where sessionToken = ?`;
            await client.query(sql, [sessionToken]);
        },
        async unlinkAccount(partialAccount) {
            const { provider, providerAccountId } = partialAccount;
            const sql = `delete from accounts where providerAccountId = ? and provider = ?`;
            await client.query(sql, [providerAccountId, provider]);
        },
        async deleteUser(userId) {
            await client.query(`delete from users where id = ?`, [userId]);
            await client.query(`delete from sessions where userId = ?`, [userId]);
            await client.query(`delete from accounts where userId = ?`, [userId]);
        },
    };
};
export default mysqlAdapter;
//# sourceMappingURL=index.js.map