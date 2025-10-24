require('dotenv').config()
const crypto = require("crypto");
const axios = require("axios");
const User = require("../models/User.js");

const authStore = new Map();

class OAuthController {
  constructor() {
    this.clientId = process.env.TWITTER_CLIENT_ID;
    this.clientSecret = process.env.TWITTER_CLIENT_SECRET;
    this.callbackUrl = process.env.CALLBACK_URL;
    this.authUrl = "https://twitter.com/i/oauth2/authorize";
    this.tokenUrl = "https://api.twitter.com/2/oauth2/token";
  }
  
  // Generate PKCE challenge
  generatePKCE() {
    const codeVerifier = crypto.randomBytes(32).toString("base64url");
    const codeChallenge = crypto
      .createHash("sha256")
      .update(codeVerifier)
      .digest("base64url");
    return { codeVerifier, codeChallenge };
  }
  
  // Initiate OAuth flow
  initiateAuth(req, res) {
    const { codeVerifier, codeChallenge } = this.generatePKCE();
    const state = crypto.randomBytes(16).toString("hex");
    
    // Store for callback validation (expires in 10 minutes)
    authStore.set(state, { codeVerifier, timestamp: Date.now() });
    setTimeout(() => authStore.delete(state), 10 * 60 * 1000);
    
    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.clientId,
      redirect_uri: this.callbackUrl,
      scope: "tweet.read tweet.write users.read offline.access",
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });
    
    res.redirect(`${this.authUrl}?${params.toString()}`);
  }
  
  // Handle callback
  async handleCallback(req, res) {
    const { code, state } = req.query;
    
    // Validate state
    const authData = authStore.get(state);
    if (!authData) {
      return res.status(400).send("Invalid or expired state");
    }
    
    const { codeVerifier } = authData;
    authStore.delete(state);
    
    try {
      // Exchange code for tokens
      const tokenResponse = await axios.post(
        this.tokenUrl,
        new URLSearchParams({
          code: code,
          grant_type: "authorization_code",
          client_id: this.clientId,
          redirect_uri: this.callbackUrl,
          code_verifier: codeVerifier,
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
      
      const { access_token, refresh_token, expires_in } = tokenResponse.data;
      
      // Fetch user profile
      const userResponse = await axios.get("https://api.twitter.com/2/users/me", {
        headers: { Authorization: `Bearer ${access_token}` },
        params: {
          "user.fields": "profile_image_url,verified",
        },
      });
      
      const profile = userResponse.data.data;
      
      // Find or create user
      let user = await User.findOne({ user_id: profile.id });
      if (!user) {
        user = new User({
          user_id: profile.id,
          username: profile.username,
          profile: profile.profile_image_url || "",
          is_verified: profile.verified || false,
        });
      } else {
        user.username = profile.username;
        user.profile = profile.profile_image_url || "";
        user.is_verified = profile.verified || false;
      }
      
      // Store tokens
      await user.updateTokens(access_token, refresh_token, expires_in);
      
      // Login user
      req.login(user, (err) => {
        if (err) {
          console.error("Login error:", err);
          return res.status(500).send("Login failed");
        }
        res.redirect("/");
      });
    } catch (error) {
      console.error("OAuth callback error:", error.response?.data || error.message);
      res.status(500).send("Authentication failed");
    }
  }
}

module.exports = new OAuthController();