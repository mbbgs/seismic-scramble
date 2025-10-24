require('dotenv').config()
const axios = require("axios");
const User = require("../models/User.js");

class TokenManager {
  constructor() {
    this.clientId = process.env.TWITTER_CLIENT_ID;
    this.clientSecret = process.env.TWITTER_CLIENT_SECRET;
    this.tokenUrl = "https://api.twitter.com/2/oauth2/token";
  }

  /**
   * Refresh an expired access token
   */
  async refreshAccessToken(userId) {
    try {
      const user = await User.findOne({ user_id: userId })
        .select("+refresh_token");
      
      if (!user || !user.refresh_token) {
        throw new Error("No refresh token available");
      }

      const response = await axios.post(
        this.tokenUrl,
        new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: user.refresh_token,
          client_id: this.clientId,
        }),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": `Basic ${Buffer.from(
              `${this.clientId}:${this.clientSecret}`
            ).toString("base64")}`,
          },
        }
      );

      const { access_token, refresh_token, expires_in } = response.data;

      // Update tokens in database
      await user.updateTokens(
        access_token,
        refresh_token || user.refresh_token,
        expires_in
      );

      return access_token;
    } catch (error) {
      console.error("Token refresh failed:", error.response?.data || error.message);
      throw new Error("Failed to refresh token");
    }
  }

  /**
   * Get valid access token (refresh if expired)
   */
  async getValidToken(userId) {
    const user = await User.findOne({ user_id: userId })
      .select("+access_token +token_expires_at");

    if (!user) {
      throw new Error("User not found");
    }

    // Check if token is expired
    if (user.isTokenExpired()) {
      console.log("Token expired, refreshing...");
      return await this.refreshAccessToken(userId);
    }

    return user.access_token;
  }

  /**
   * Revoke tokens on logout
   */
  async revokeTokens(userId) {
    try {
      const user = await User.findOne({ user_id: userId })
        .select("+access_token +refresh_token");

      if (user?.access_token) {
        // Revoke access token
        await axios.post(
          "https://api.twitter.com/2/oauth2/revoke",
          new URLSearchParams({
            token: user.access_token,
            token_type_hint: "access_token",
            client_id: this.clientId,
          }),
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "Authorization": `Basic ${Buffer.from(
                `${this.clientId}:${this.clientSecret}`
              ).toString("base64")}`,
            },
          }
        );
      }

      // Clear tokens from database
      user.access_token = undefined;
      user.refresh_token = undefined;
      user.token_expires_at = undefined;
      await user.save();

      return true;
    } catch (error) {
      console.error("Token revocation failed:", error.response?.data || error.message);
      return false;
    }
  }
}

module.exports = new TokenManager();
