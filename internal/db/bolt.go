package db

import (
	"encoding/json"
	"time"

	"go.etcd.io/bbolt"
)

// DB wraps a Bolt database instance.
type DB struct {
	*bbolt.DB
}

// Open opens or creates the Bolt database file.
func Open(path string) (*DB, error) {
	database, err := bbolt.Open(path, 0o600, &bbolt.Options{Timeout: 1 * time.Second})
	if err != nil {
		return nil, err
	}
	return &DB{database}, nil
}

// SavePing stores the ping in a date bucket.
func (db *DB) SavePing(bucket string, id string, payload any) error {
	return db.Update(func(tx *bbolt.Tx) error {
		b, err := tx.CreateBucketIfNotExists([]byte(bucket))
		if err != nil {
			return err
		}
		bytes, err := json.Marshal(payload)
		if err != nil {
			return err
		}
		return b.Put([]byte(id), bytes)
	})
}

// IteratePings walks the bucket and passes each payload to the callback.
func (db *DB) IteratePings(bucket string, fn func([]byte) error) error {
	return db.View(func(tx *bbolt.Tx) error {
		b := tx.Bucket([]byte(bucket))
		if b == nil {
			return nil
		}
		return b.ForEach(func(_, v []byte) error {
			return fn(v)
		})
	})
}
