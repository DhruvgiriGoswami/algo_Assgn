package main

import (
    "context"
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "os"
    "time"

    "github.com/gorilla/mux"
    "go.mongodb.org/mongo-driver/bson/primitive"
    "go.mongodb.org/mongo-driver/mongo"
    "go.mongodb.org/mongo-driver/mongo/options"
)

// Holiday represents a holiday entry
type Holiday struct {
    ID   primitive.ObjectID `json:"id,omitempty" bson:"_id,omitempty"`
    Date string             `json:"date,omitempty" bson:"date,omitempty"`
    Name string             `json:"name,omitempty" bson:"name,omitempty"`
}

var client *mongo.Client

func main() {
    // Get MongoDB URI from env variable
    mongoURI := os.Getenv("MONGO_URI")
    if mongoURI == "" {
        log.Fatal("MONGO_URI environment variable is not set")
    }

    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    var err error
    client, err = mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
    if err != nil {
        log.Fatal(err)
    }
    fmt.Println("Connected to MongoDB")

    // Create router and define endpoints
    router := mux.NewRouter()
    router.Use(corsMiddleware)
    router.HandleFunc("/holidays", createHoliday).Methods("POST")
    router.HandleFunc("/holidays", getHolidays).Methods("GET")
    router.HandleFunc("/holidays/{id}", deleteHoliday).Methods("DELETE")
    router.PathPrefix("/").Methods(http.MethodOptions).HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
    })

    port := os.Getenv("PORT")
    if port == "" {
        port = "8080" // default port
    }
    fmt.Println("Server running on port", port)
    log.Fatal(http.ListenAndServe(":"+port, router))
}

// corsMiddleware and the handler functions (createHoliday, getHolidays, deleteHoliday) remain unchanged...


// corsMiddleware adds the necessary headers to allow CORS
func corsMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Set CORS headers
        w.Header().Set("Access-Control-Allow-Origin", "https://dhruvgirigoswami.github.io") // Use specific domain in production
        w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

        // If this is an OPTIONS request, end here
        if r.Method == http.MethodOptions {
            w.WriteHeader(http.StatusOK)
            return
        }

        next.ServeHTTP(w, r)
    })
}

// createHoliday, getHolidays, and deleteHoliday functions remain unchanged...

func createHoliday(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    
    // Decode the incoming JSON into our Holiday struct
    var holiday Holiday
    err := json.NewDecoder(r.Body).Decode(&holiday)
    if err != nil {
        log.Printf("Error decoding request: %v", err)
        http.Error(w, "Error decoding request", http.StatusBadRequest)
        return
    }
    
    // Log the decoded holiday so you know what is being inserted
    log.Printf("Decoded holiday: %+v", holiday)

    collection := client.Database("holidaycalendar").Collection("holidays")
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    result, err := collection.InsertOne(ctx, holiday)
    if err != nil {
        // Log the detailed error message from MongoDB
        log.Printf("Error inserting holiday: %v", err)
        http.Error(w, "Error inserting holiday", http.StatusInternalServerError)
        return
    }
    
    // Log the successful insertion result
    log.Printf("Insert result: %+v", result)
    json.NewEncoder(w).Encode(result)
}



func getHolidays(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	var holidays []Holiday

	collection := client.Database("holidaycalendar").Collection("holidays")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	cursor, err := collection.Find(ctx, primitive.M{})
	if err != nil {
		http.Error(w, "Error fetching holidays", http.StatusInternalServerError)
		return
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var holiday Holiday
		cursor.Decode(&holiday)
		holidays = append(holidays, holiday)
	}

	json.NewEncoder(w).Encode(holidays)
}

func deleteHoliday(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	params := mux.Vars(r)
	id, err := primitive.ObjectIDFromHex(params["id"])
	if err != nil {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}

	collection := client.Database("holidaycalendar").Collection("holidays")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	result, err := collection.DeleteOne(ctx, primitive.M{"_id": id})
	if err != nil {
		http.Error(w, "Error deleting holiday", http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(result)
}
