
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import axios from "axios";

admin.initializeApp();
const db = admin.firestore();

const PLACES_API_URL = "https://places.googleapis.com/v1/places/";
const FIELD_MASK = "id,displayName,formattedAddress,location,regularOpeningHours,websiteUri,editorialSummary";

/**
 * Helper function to fetch data from Google Places API and update Firestore.
 * @param {string} placeId The Google Place ID of the venue.
 * @param {string} apiKey The Google Maps API key.
 * @return {Promise<void>} A promise that resolves when the update is complete.
 */
async function updateVenueFromPlaceId(placeId: string, apiKey: string): Promise<void> {
  try {
    const response = await axios.get(`${PLACES_API_URL}${placeId}`, {
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
    });

    const placeData = response.data;
    const venueDocRef = db.collection("venues").doc(placeId);

    // Build the data object for Firestore, only including fields that exist in the API response.
    const firestoreData: {[key: string]: any} = {
      googlePlaceId: placeData.id,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (placeData.displayName?.text) {
      firestoreData.name = placeData.displayName.text;
    }
    if (placeData.formattedAddress) {
      firestoreData.address = placeData.formattedAddress;
    }
    if (placeData.location?.latitude && placeData.location?.longitude) {
      firestoreData.coordinates = {
        lat: placeData.location.latitude,
        lng: placeData.location.longitude,
      };
    }
    if (placeData.editorialSummary?.text) {
      firestoreData.description = placeData.editorialSummary.text;
    }
    if (placeData.regularOpeningHours) {
      firestoreData.googleOpeningHours = placeData.regularOpeningHours;
      if (placeData.regularOpeningHours.weekdayDescriptions) {
        firestoreData.operatingHours = placeData.regularOpeningHours.weekdayDescriptions.join("\n");
      }
    }
    if (placeData.websiteUri) {
      firestoreData.websiteUrl = placeData.websiteUri;
    }

    await venueDocRef.set(firestoreData, {merge: true});
    functions.logger.info(`Successfully updated venue: ${placeId}`);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      functions.logger.error(`Error fetching Place ID ${placeId}:`, error.response?.data);
    } else {
      functions.logger.error(`An unexpected error occurred for Place ID ${placeId}:`, error);
    }
    // Re-throw the error to be handled by the calling function.
    throw error;
  }
}

/**
 * A callable function to fetch and save details for a single venue using its Google Place ID.
 */
export const fetchAndSaveVenue = functions.https
    .runWith({secrets: ["GOOGLE_MAPS_API_KEY"]})
    .onCall(async (data, context) => {
      const placeId = data.placeId;
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;

      if (!apiKey) {
        throw new functions.https.HttpsError("internal", "API key is not configured.");
      }

      if (!placeId || typeof placeId !== "string") {
        throw new functions.https.HttpsError("invalid-argument", "The function must be called with a 'placeId' string argument.");
      }

      try {
        await updateVenueFromPlaceId(placeId, apiKey);
        return {success: true, message: `Venue ${placeId} updated successfully.`};
      } catch (error) {
        throw new functions.https.HttpsError("internal", `Failed to update venue ${placeId}.`);
      }
    });

/**
 * A scheduled function that runs every Monday at 3 AM to update all venues
 * that have a 'googlePlaceId'.
 */
export const updateVenuesWeekly = functions.pubsub
    .schedule("0 3 * * 1") // Every Monday at 3:00 AM
    .timeZone("Asia/Seoul")
    .runWith({secrets: ["GOOGLE_MAPS_API_KEY"]})
    .onRun(async (context) => {
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        functions.logger.error("API key is not configured. Aborting weekly update.");
        return null;
      }

      functions.logger.info("Starting weekly venue update job.");

      try {
        const venuesRef = db.collection("venues");
        const snapshot = await venuesRef.where("googlePlaceId", "!=", null).get();

        if (snapshot.empty) {
          functions.logger.info("No venues with googlePlaceId found to update.");
          return null;
        }

        const updatePromises: Promise<void>[] = [];
        snapshot.forEach((doc) => {
          const venue = doc.data();
          if (venue.googlePlaceId) {
            updatePromises.push(updateVenueFromPlaceId(venue.googlePlaceId, apiKey));
          }
        });

        await Promise.all(updatePromises);
        functions.logger.info(`Weekly venue update completed successfully for ${updatePromises.length} venues.`);
        return null;
      } catch (error) {
        functions.logger.error("Weekly venue update job failed.", error);
        return null;
      }
    });
