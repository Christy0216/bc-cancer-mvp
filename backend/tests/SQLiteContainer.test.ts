import SQLiteContainer from '../src/SQLiteContainer';
import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { EventSchema, DonorSchema, TaskSchema } from '../src/SQLiteContainer';

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

describe('Donor Management Tests', () => {
    test('should add donors successfully and verify them in the database', () => {
        // Initialize the SQLite container and ensure tables are created
        const donorManager = new SQLiteContainer('test_db_donor_verification');

        const donors: DonorSchema[] = [
            {
                donor_id: 0, // This field will be auto-incremented by the database
                first_name: 'Carlos',
                nick_name: 'Charlie',
                last_name: 'Smith',
                pmm: 'PMM123',
                organization_name: 'Helping Hands Inc.',
                city: 'Los Angeles',
                total_donations: 5000,
            },
            {
                donor_id: 0, // This field will be auto-incremented by the database
                first_name: 'Maria',
                nick_name: 'Mia',
                last_name: 'Johnson',
                pmm: 'PMM456',
                organization_name: 'Bright Future Foundation',
                city: 'San Francisco',
                total_donations: 7500,
            }
        ];

        // Add donors
        const [code, message] = donorManager.addDonors(donors);
        expect(code).toBe(200);
        expect(message).toBe('Donors added successfully.');

        // Verify the donors exist in the database
        const db = new Database(path.join(testDirectory, 'test_db_donor_verification.db'));

        // Check if the donors table was created
        const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='donors';").get();
        expect(tables).toBeDefined();

        const stmt = db.prepare('SELECT * FROM donors');
        const addedDonors = stmt.all() as DonorSchema[];

        // Check that the number of donors matches
        expect(addedDonors.length).toBe(donors.length);

        // Check that each donor's details match
        for (let i = 0; i < donors.length; i++) {
            expect(addedDonors[i].first_name).toBe(donors[i].first_name);
            expect(addedDonors[i].nick_name).toBe(donors[i].nick_name);
            expect(addedDonors[i].last_name).toBe(donors[i].last_name);
            expect(addedDonors[i].pmm).toBe(donors[i].pmm);
            expect(addedDonors[i].organization_name).toBe(donors[i].organization_name);
            expect(addedDonors[i].city).toBe(donors[i].city);
            expect(addedDonors[i].total_donations).toBe(donors[i].total_donations);
        }

        db.close(); // Close the database connection
    });

    test('should return 500 error when database fails during addDonors', () => {
        const donorManager = new SQLiteContainer('test_db_donor_failure');

        const donors: DonorSchema[] = [
            {
                donor_id: 0,
                first_name: 'John',
                nick_name: 'Johnny',
                last_name: 'Doe',
                pmm: 'PMM789',
                organization_name: 'Care for All',
                city: 'New York',
                total_donations: 10000,
            }
        ];

        // Mock the database instance to throw an error
        mockDb = donorManager['db'] as jest.Mocked<Database.Database>;
        mockDb.prepare = jest.fn().mockImplementation(() => {
            throw new Error('Database error');
        });

        const [code, message] = donorManager.addDonors(donors);
        expect(code).toBe(500);
        expect(message).toBe('An error occurred: Database error');
    });
});

describe('Task Creation Tests', () => {
    test('should create tasks for each donor related to a specific event', () => {
        // Initialize the SQLite container
        const dbName = 'test_db_task_creation';
        const taskManager = new SQLiteContainer(dbName);
    
        // Define and add a sample event
        const event = {
            name: 'Annual Fundraiser',
            location: 'Chicago',
            date: '2024-11-25',
            description: 'A fundraiser event for charity.'
        };
        const [eventCode, eventMessage] = taskManager.addEvent(event);
        const eventId = parseInt(eventMessage.split('ID: ')[1]);
    
        expect(eventCode).toBe(200);
        expect(eventId).toBeDefined();
    
        // Define and add sample donors
        const donors: DonorSchema[] = [
            { donor_id: 0, first_name: 'John', nick_name: '', last_name: 'Doe', pmm: 'PMM1', organization_name: 'Org1', city: 'Chicago', total_donations: 100 },
            { donor_id: 0, first_name: 'Jane', nick_name: '', last_name: 'Smith', pmm: 'PMM2', organization_name: 'Org2', city: 'New York', total_donations: 150 }
        ];
        const [donorCode, donorMessage] = taskManager.addDonors(donors);
    
        expect(donorCode).toBe(200);
    
        // Retrieve the donor IDs from the database to use in task creation
        const db = new Database(path.join(testDirectory, `${dbName}.db`));
        const donorRecords = db.prepare('SELECT donor_id FROM donors').all() as { donor_id: number }[];
        const donorIds = donorRecords.map(record => record.donor_id);
    
        expect(donorIds.length).toBe(donors.length);
    
        // Call createTasksForEvent with the eventId and donorIds
        const [taskCode, taskMessage] = taskManager.createTasksForEvent(eventId, donorIds);
        expect(taskCode).toBe(200);
        expect(taskMessage).toBe(`Tasks created for event ID: ${eventId}`);
    
        // Verify tasks in the database
        const tasks = db.prepare('SELECT * FROM tasks WHERE event_id = ?').all(eventId) as TaskSchema[];
    
        expect(tasks.length).toBe(donorIds.length);
        tasks.forEach((task: TaskSchema, index) => {
            expect(task.event_id).toBe(eventId);
            expect(task.donor_id).toBe(donorIds[index]);
            expect(task.status).toBe('pending');
        });
    
        db.close(); // Close the database connection
    });
    
});