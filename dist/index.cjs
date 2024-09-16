"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  default: () => src_default,
  mapExpiresAt: () => mapExpiresAt
});
module.exports = __toCommonJS(src_exports);
var mapExpiresAt = (account) => {
  const expires_at = parseInt(account.expires_at);
  return {
    ...account,
    expires_at
  };
};
var mysqlAdapter = (client) => {
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
    async useVerificationToken({
      identifier,
      token
    }) {
      const sql = `select* from verification_token
      where identifier = ? and token = ?`;
      const sql1 = `delete from verification_token
      where identifier = ? and token = ?
      `;
      try {
        const [result] = await client.query(sql, [identifier, token]);
        if (result[0]) {
          const [result1] = await client.query(sql1, [
            identifier,
            token
          ]);
          if (result1.affectedRows) {
            return result[0];
          }
        }
        return null;
      } catch {
        return null;
      }
    },
    async createUser(user) {
      const { name, email, emailVerified, image } = user;
      const sql = `
        INSERT INTO users (name, email, emailVerified, image) 
        VALUES (?, ?, ?, ?) 
        `;
      const [result] = await client.query(sql, [
        name,
        email,
        emailVerified,
        image
      ]);
      const [result1] = await client.query("select * from users where id=?", [
        result.insertId
      ]);
      const [reResult1] = result1;
      return reResult1;
    },
    async getUser(id) {
      const sql = `select * from users where id = ?`;
      try {
        const [result] = await client.query(sql, [id]);
        const reResult = result;
        return reResult[0] ? reResult[0] : null;
      } catch (e) {
        return null;
      }
    },
    async getUserByEmail(email) {
      const sql = `select * from users where email = ?`;
      const [result] = await client.query(sql, [email]);
      const reResult = result;
      return reResult[0] ? reResult[0] : null;
    },
    async getUserByAccount({
      providerAccountId,
      provider
    }) {
      const sql = `
          select * from users u join accounts a on u.id = a.userId
          where 
          a.provider = ? 
          and 
          a.providerAccountId = ?`;
      const [result] = await client.query(sql, [provider, providerAccountId]);
      const reResult = result;
      if (reResult[0]) {
        const { email, emailVerified, id, image, name } = reResult[0];
        return { name, email, emailVerified, id, image };
      }
      return null;
    },
    async updateUser(user) {
      const fetchSql = `select * from users where id = ?`;
      const [query1] = await client.query(fetchSql, [user.id]);
      const [oldUser] = query1;
      const newUser = {
        ...oldUser,
        ...user
      };
      const { id, name, email, emailVerified, image } = newUser;
      const updateSql = `
        UPDATE users set
        name =?, email = ?, emailVerified = ?, image = ?
        where id = ?
        
      `;
      const [query2] = await client.query(updateSql, [
        name,
        email,
        emailVerified,
        image,
        id
      ]);
      if (query2.affectedRows) return newUser;
      else throw new Error("nothing find ");
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
        account.token_type
      ];
      const [result] = await client.query(sql, params);
      return result.insertId ? mapExpiresAt(account) : null;
    },
    async createSession({ sessionToken, userId, expires }) {
      if (userId === void 0) {
        throw Error(`userId is undef in createSession`);
      }
      const sql = `insert into sessions (userId, expires, sessionToken)
      values (?, ?, ?)
    `;
      const [result] = await client.query(sql, [
        userId,
        expires,
        sessionToken
      ]);
      if (result.insertId)
        return { id: result.insertId, sessionToken, userId, expires };
      else throw new Error("nothing created ");
    },
    async getSessionAndUser(sessionToken) {
      if (sessionToken === void 0) {
        return null;
      }
      const [result1] = await client.query(
        `select * from sessions where sessionToken = ?`,
        [sessionToken]
      );
      const [oldUser] = result1;
      if (!oldUser) {
        return null;
      }
      const [result2] = await client.query("select * from users where id = ?", [
        oldUser.userId
      ]);
      const [newUser] = result2;
      if (!newUser) {
        return null;
      }
      return {
        session: oldUser,
        user: newUser
      };
    },
    async updateSession(session) {
      const { sessionToken } = session;
      const [result1] = await client.query(
        `select * from sessions where sessionToken = ?`,
        [sessionToken]
      );
      const [originalSession] = result1;
      if (!originalSession) {
        return null;
      }
      const newSession = {
        ...originalSession,
        ...session
      };
      const sql = `
        UPDATE sessions set
        expires = ?
        where sessionToken = ?
        `;
      const [result] = await client.query(sql, [
        newSession.expires,
        newSession.sessionToken
      ]);
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
      return null;
    }
  };
};
var src_default = mysqlAdapter;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  mapExpiresAt
});
