import SQLiteContainer from '../src/SQLiteContainer';
import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

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

    test('should add an event successfully', () => {
        const eventManager = new SQLiteContainer('test_db_event_success');
        const event = {
            name: 'Charity Gala',
            location: 'New York',
            date: '2024-11-20',
            description: 'An exclusive charity gala to support cancer research.'
        };
        const [code, message] = eventManager.addEvent(event);
        expect(code).toBe(200);
        expect(message).toMatch(/Event added with ID/);
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
