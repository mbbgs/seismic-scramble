require('dotenv').config();
const crypto = require("crypto");
const axios = require("axios");
const User = require("../models/User.js");

// Use database or Redis in production instead of Map
const authStore = new Map();

class OAuthController {
  constructor() {
    this.clientId = process.env.TWITTER_CLIENT_ID;
    this.clientSecret = process.env.TWITTER_CLIENT_SECRET;
    this.callbackUrl = process.env.CALLBACK_URL;
    this.authUrl = "https://twitter.com/i/oauth2/authorize";
    this.tokenUrl = "https://api.twitter.com/2/oauth2/token";
    
    // Validate required env vars
    if (!this.clientId || !this.clientSecret || !this.callbackUrl) {
      throw new Error("Missing required OAuth environment variables");
    }
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
    try {
      const { codeVerifier, codeChallenge } = this.generatePKCE();
      const state = crypto.randomBytes(16).toString("hex");
      
      // Store for callback validation (expires in 10 minutes)
      authStore.set(state, {
        codeVerifier,
        timestamp: Date.now()
      });
      setTimeout(() => authStore.delete(state), 10 * 60 * 1000);
      
      const params = new URLSearchParams({
        response_type: "code",
        client_id: this.clientId,
        redirect_uri: this.callbackUrl,
        scope: "tweet.read users.read offline.access", // Keep consistent
        state: state,
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
      });
      
      const authorizationUrl = `${this.authUrl}?${params.toString()}`;
      console.log("Redirecting to:", authorizationUrl);
      
      res.redirect(authorizationUrl);
    } catch (error) {
      console.error("Error initiating auth:", error);
      res.status(500).send("Failed to initiate authentication");
    }
  }
  
  // Handle callback
  async handleCallback(req, res) {
    const { code, state, error, error_description } = req.query;
    
    // Check for OAuth errors
    if (error) {
      console.error("OAuth error:", error, error_description);
      return res.status(400).render("error_400.html", {
        message: `Authentication failed: ${error_description || error}`
      });
    }
    
    // Validate required parameters
    if (!code || !state) {
      console.error("Missing code or state parameter");
      return res.status(400).send("Missing required parameters");
    }
    
    // Validate state
    const authData = authStore.get(state);
    if (!authData) {
      console.error("Invalid or expired state:", state);
      return res.status(400).send("Invalid or expired state parameter. Please try logging in again.");
    }
    
    const { codeVerifier } = authData;
    authStore.delete(state);
    
    try {
      // Exchange code for tokens
      const tokenParams = new URLSearchParams({
        code: code,
        grant_type: "authorization_code",
        client_id: this.clientId,
        redirect_uri: this.callbackUrl,
        code_verifier: codeVerifier,
      });
      
      console.log("Exchanging code for token...");
      
      const tokenResponse = await axios.post(
        this.tokenUrl,
        tokenParams.toString(),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": `Basic ${Buffer.from(
              `${this.clientId}:${this.clientSecret}`
            ).toString("base64")}`,
          },
          timeout: 10000, // 10 second timeout
        }
      );
      
      const { access_token, refresh_token, expires_in } = tokenResponse.data;
      
      if (!access_token) {
        throw new Error("No access token received from Twitter");
      }
      
      console.log("Token received, fetching user profile...");
      
      // Fetch user profile
      const userResponse = await axios.get(
        "https://api.twitter.com/2/users/me",
        {
          headers: {
            Authorization: `Bearer ${access_token}`
          },
          params: {
            "user.fields": "profile_image_url,verified",
          },
          timeout: 10000,
        }
      );
      
      const profile = userResponse.data.data;
      
      if (!profile || !profile.id) {
        throw new Error("Invalid user profile received from Twitter");
      }
      
      console.log("User profile fetched:", profile.username);
      
      // Find or create user
      let user = await User.findOne({ user_id: profile.id });
      
      if (!user) {
        user = new User({
          user_id: profile.id,
          username: profile.username,
          profile: profile.profile_image_url || "",
          is_verified: profile.verified || false,
          radar: "green",
          game_start: new Date(),
          has_played: false,
          score: 0,
        });
      } else {
        user.username = profile.username;
        user.profile = profile.profile_image_url || "";
        user.is_verified = profile.verified || false;
      }
      
      // Store tokens securely
      if (typeof user.updateTokens === 'function') {
        await user.updateTokens(access_token, refresh_token, expires_in);
      } else {
        // Fallback if updateTokens method doesn't exist
        user.access_token = access_token;
        user.refresh_token = refresh_token;
        user.token_expires_at = new Date(Date.now() + (expires_in * 1000));
        await user.save();
      }
      
      console.log("User saved, logging in...");
      
      // Login user
      req.login(user, (err) => {
        if (err) {
          console.error("Login error:", err);
          return res.status(500).send("Login failed. Please try again.");
        }
        console.log("Login successful, redirecting...");
        res.redirect("/");
      });
      
    } catch (error) {
      console.error("OAuth callback error:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      
      // Provide user-friendly error messages
      let errorMessage = "Authentication failed. ";
      
      if (error.response?.status === 401) {
        errorMessage += "Invalid credentials. Please check your Twitter app settings.";
      } else if (error.response?.status === 400) {
        errorMessage += "Bad request. The authorization code may have expired.";
      } else if (error.code === 'ECONNABORTED') {
        errorMessage += "Request timeout. Please try again.";
      } else {
        errorMessage += "Please try again later.";
      }
      
      res.status(500).send(errorMessage);
    }
  }
  
  // Refresh access token
  async refreshAccessToken(refreshToken) {
    try {
      const tokenResponse = await axios.post(
        this.tokenUrl,
        new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
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
      
      return tokenResponse.data;
    } catch (error) {
      console.error("Token refresh error:", error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = new OAuthController();