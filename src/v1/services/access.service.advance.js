"use strict";

const shopModel = require("../models/shop.model");
const bcrypt = require("bcrypt");
const crypto = require("node:crypto");
const KeyTokenService = require("./keyToken.service.advance");
const createTokenPair = require("../auth/authUtils");
const { getInfoData } = require("../utils");

const RoleShop = {
  SHOP: "0003",
  WRITER: "0002",
  EDITOR: "0001",
  ADMIN: "0000",
};
class AccessService {
  static signUp = async ({ name, email, password }) => {
    try {
      const holderShop = await shopModel.findOne({ email }).lean();
      if (holderShop) {
        return {
          code: "xxxx",
          message: "Shop already registered!",
        };
      }
      const passwordHash = await bcrypt.hash(password, 10);
      const newShop = await shopModel.create({
        name,
        email,
        password: passwordHash,
        roles: [RoleShop.SHOP],
      });
      if (newShop) {
        //created privateKey , publicKey
        const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
          modulusLength: 4096,
          publicKeyEncoding: {
            type: "pkcs1",
            format: "pem",
          },
          privateKeyEncoding: {
            type: "pkcs1",
            format: "pem",
          },
        });
        //
        const publicKeyString = await KeyTokenService.createKeyToken({
          userId: newShop._id,
          publicKey,
        });
        if (!publicKeyString) {
          return {
            code: "xxxx",
            message: "publicKeyString error",
          };
        }
        const publicKeyObject = crypto.createPublicKey(publicKeyString);
        const tokens = await createTokenPair(
          { userId: newShop._id, email },
          publicKeyObject,
          privateKey
        );
        console.log(`Created Token Success::`, tokens);
        return {
          code: 201,
          metadata: {
            shop: getInfoData({
              fields: ["_id", "name", "email"],
              object: newShop,
            }),
            tokens,
          },
        };
      }
      return {
        code: 200,
        metadata: null,
      };
    } catch (error) {
      return {
        code: "xxx",
        message: error.message,
        status: "error",
      };
    }
  };
}
module.exports = AccessService;
