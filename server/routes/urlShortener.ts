import express from "express";
import { UrlShortenerService } from "../services/urlShortenerService";
import { verifyFirebaseAuth } from "../middleware/firebase-auth";

const router = express.Router();

router.post("/shorten", verifyFirebaseAuth, async (req, res) => {
  try {
    const { originalUrl, resourceType, resourceId } = req.body;
    
    if (!originalUrl) {
      return res.status(400).json({ 
        success: false, 
        message: "originalUrl is required" 
      });
    }

    const firebaseUid = (req as any).firebaseUid;
    if (!firebaseUid) {
      return res.status(401).json({ 
        success: false, 
        message: "Authentication required" 
      });
    }

    const result = await UrlShortenerService.createShortUrl({
      originalUrl,
      firebaseUid,
      resourceType,
      resourceId,
    });

    res.json({
      success: true,
      shortCode: result.shortCode,
      shortUrl: result.shortUrl,
      originalUrl,
    });
  } catch (error) {
    console.error("❌ [URL-SHORTENER] Error creating short URL:", error);
    
    // 🛡️ SECURITY: Return 400 for validation errors (invalid protocol, invalid URL format)
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    if (errorMessage.includes("Invalid protocol") || errorMessage.includes("Invalid URL format")) {
      return res.status(400).json({ 
        success: false, 
        message: errorMessage
      });
    }
    
    // Generic 500 for other errors
    res.status(500).json({ 
      success: false, 
      message: "Failed to create short URL" 
    });
  }
});

router.get("/list", verifyFirebaseAuth, async (req, res) => {
  try {
    const firebaseUid = (req as any).firebaseUid;
    if (!firebaseUid) {
      return res.status(401).json({ 
        success: false, 
        message: "Authentication required" 
      });
    }

    const shortUrls = await UrlShortenerService.getUserShortUrls(firebaseUid);

    res.json({
      success: true,
      shortUrls,
    });
  } catch (error) {
    console.error("❌ [URL-SHORTENER] Error fetching short URLs:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch short URLs" 
    });
  }
});

export default router;
