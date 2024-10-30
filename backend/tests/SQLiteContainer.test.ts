import SQLiteContainer from '../src/SQLiteContainer';
import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { EventSchema } from '../src/SQLiteContainer';

const testDirectory = path.join(__dirname, '..');
let mockDb: jest.Mocked<Database.Database>;

const deleteTestDatabases = () => {
    if (fs.existsSync(testDirectory)) {
        fs.readdirSync(testDirectory).forEach(file => {
            const filePath = path.join(testDirectory, file);
            if (file.startsWith('test_db_') && file.endsWith('.db')) {
                fs.unlinkSync(filePath);
                console.log(`Deleted file: ${filePath}`);
            }
        });
    }
};

beforeAll(() => {
    deleteTestDatabases();
});

afterAll(() => {
    deleteTestDatabases();
});

describe('Event Management Tests', () => {
    test('initialize event manager should create a database file', () => {
        const eventManager = new SQLiteContainer('test_db_event');
        const dbPath = path.join(testDirectory, 'test_db_event.db');
        expect(fs.existsSync(dbPath)).toBe(true);
    });

    test('should add an event successfully and verify it in the database', () => {
        // Initialize the SQLite container and ensure tables are created
        const eventManager = new SQLiteContainer('test_db_event_verification');

        const event = {
            name: 'Charity Gala',
            location: 'New York',
            date: '2024-11-20',
            description: 'An exclusive charity gala to support cancer research.'
        };

        // Add the event
        const [code, message] = eventManager.addEvent(event);
        expect(code).toBe(200);
        expect(message).toMatch(/Event added with ID/);

        // Verify the event exists in the database
        const db = new Database(path.join(testDirectory, 'test_db_event_verification.db'));

        // Check if the events table was created
        const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='events';").get();
        expect(tables).toBeDefined();

        const stmt = db.prepare('SELECT * FROM events WHERE name = ?');
        const addedEvent = stmt.get(event.name) as EventSchema;

        // Check that the event details match
        expect(addedEvent).toBeDefined();
        expect(addedEvent.name).toBe(event.name);
        expect(addedEvent.location).toBe(event.location);
        expect(addedEvent.date).toBe(event.date);
        expect(addedEvent.description).toBe(event.description);

        db.close(); // Close the database connection
    });

    test('should return 500 error when database fails during addEvent', () => {
        const eventManager = new SQLiteContainer('test_db_event_failure');
        const event = {
            name: 'Annual Fundraiser',
            location: 'San Francisco',
            date: '2024-10-30',
            description: 'Fundraiser event for cancer research.'
        };

        // Mock the database instance to throw an error
        mockDb = eventManager['db'] as jest.Mocked<Database.Database>;
        mockDb.prepare = jest.fn().mockImplementation(() => {
            throw new Error('Database error');
        });

        const [code, message] = eventManager.addEvent(event);
        expect(code).toBe(500);
        expect(message).toBe('An error occurred: Database error');
    });
});
