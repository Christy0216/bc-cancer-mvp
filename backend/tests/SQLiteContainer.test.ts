// SQLiteContainerTests.ts
import SQLiteContainer from '../src/SQLiteContainer';
import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { runTaskManagerTests } from './TaskManagerInterfaceTests';
import { EventSchema, DonorSchema, TaskSchema } from '../src/Types';

const testDirectory = path.join(__dirname, '..');

const createSQLiteContainer = () => new SQLiteContainer(`test_db_${Date.now()}`);

// Run the interface compliance tests
runTaskManagerTests(createSQLiteContainer);

// Run the SQLiteContainer specific tests
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

// Set up and tear down for each test suite
beforeEach(() => deleteTestDatabases());
afterEach(() => deleteTestDatabases());

// Set up and tear down for all tests
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

describe('Event Retrieval Tests', () => {
    test('should retrieve all events successfully', () => {
        const eventManager = new SQLiteContainer('test_db_event_retrieval');

        // Add a sample event to the database
        const event = { name: 'Fundraiser Gala', location: 'Vancouver', date: '2024-10-30', description: 'A gala to support cancer research.' };
        const [code] = eventManager.addEvent(event);
        expect(code).toBe(200);

        // Retrieve all events using getEvents()
        const [fetchCode, fetchedEvents] = eventManager.getEvents();
        expect(fetchCode).toBe(200);
        expect(Array.isArray(fetchedEvents)).toBe(true);

        // Verify that the fetched event matches the added event
        expect(fetchedEvents.length).toBe(1);
        const fetchedEvent = fetchedEvents[0] as EventSchema;
        expect(fetchedEvent.name).toBe(event.name);
        expect(fetchedEvent.location).toBe(event.location);
        expect(fetchedEvent.date).toBe(event.date);
        expect(fetchedEvent.description).toBe(event.description);
    });
});


describe('Donor Management Tests', () => {
    test('should add donors successfully and verify them in the database', () => {
        // Initialize the SQLite container and ensure tables are created
        const donorManager = new SQLiteContainer('test_db_donor_verification');

        const donors: Omit<DonorSchema, 'donor_id'>[] = [
            {
                first_name: 'Carlos',
                nick_name: 'Charlie',
                last_name: 'Smith',
                pmm: 'PMM123',
                organization_name: 'Helping Hands Inc.',
                city: 'Los Angeles',
                total_donations: 5000,
            },
            {
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

        const donors: Omit<DonorSchema, 'donor_id'>[] = [
            {
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
        const donors: Omit<DonorSchema, 'donor_id'>[] = [
            {first_name: 'John', nick_name: '', last_name: 'Doe', pmm: 'PMM1', organization_name: 'Org1', city: 'Chicago', total_donations: 100 },
            {first_name: 'Jane', nick_name: '', last_name: 'Smith', pmm: 'PMM2', organization_name: 'Org2', city: 'New York', total_donations: 150 }
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


describe('Task Status Update Tests', () => {
    test('should update task status to approved without a reason', () => {
        // Initialize SQLite container and add an event and donors
        const dbName = 'test_db_task_update';
        const taskManager = new SQLiteContainer(dbName);

        // Add a sample event
        const event = {
            name: 'Community Gala',
            location: 'Los Angeles',
            date: '2024-12-01',
            description: 'A community event for charity.'
        };
        const [eventCode, eventMessage] = taskManager.addEvent(event);
        const eventId = parseInt(eventMessage.split('ID: ')[1]);

        expect(eventCode).toBe(200);

        // Add a sample donor
        const donors: DonorSchema[] = [
            { donor_id: 0, first_name: 'Alice', nick_name: '', last_name: 'Green', pmm: 'PMM100', organization_name: 'Charity Works', city: 'Los Angeles', total_donations: 200 }
        ];
        const [donorCode, donorMessage] = taskManager.addDonors(donors);
        expect(donorCode).toBe(200);

        // Retrieve donor ID
        const db = new Database(path.join(testDirectory, `${dbName}.db`));
        const donorRecord = db.prepare('SELECT donor_id FROM donors').get() as { donor_id: number };
        const donorId = donorRecord.donor_id;

        // Create a task for the donor and event
        const [taskCode, taskMessage] = taskManager.createTasksForEvent(eventId, [donorId]);
        expect(taskCode).toBe(200);

        // Retrieve the created task
        const taskRecord = db.prepare('SELECT task_id FROM tasks WHERE event_id = ? AND donor_id = ?').get(eventId, donorId) as { task_id: number };
        const taskId = taskRecord.task_id;

        // Update the task status to "approved" without a reason
        const [updateCode, updateMessage] = taskManager.updateTaskStatus(taskId, 'approved');
        expect(updateCode).toBe(200);
        expect(updateMessage).toBe(`Task ${taskId} updated to approved.`);

        // Verify the task status in the database
        const updatedTask = db.prepare('SELECT * FROM tasks WHERE task_id = ?').get(taskId) as TaskSchema;
        expect(updatedTask.status).toBe('approved');
        expect(updatedTask.reason).toBeNull();

        db.close(); // Close the database connection
    });

    test('should update task status to rejected with a reason', () => {
        // Initialize SQLite container
        const dbName = 'test_db_task_rejection';
        const taskManager = new SQLiteContainer(dbName);

        // Add a sample event and donor
        const event = {
            name: 'Winter Gala',
            location: 'Seattle',
            date: '2024-12-15',
            description: 'A winter fundraising event.'
        };
        const [eventCode, eventMessage] = taskManager.addEvent(event);
        const eventId = parseInt(eventMessage.split('ID: ')[1]);

        expect(eventCode).toBe(200);

        // Add a sample donor
        const donors: DonorSchema[] = [
            { donor_id: 0, first_name: 'Bob', nick_name: '', last_name: 'Brown', pmm: 'PMM101', organization_name: 'Hope Foundation', city: 'Seattle', total_donations: 300 }
        ];
        const [donorCode, donorMessage] = taskManager.addDonors(donors);
        expect(donorCode).toBe(200);

        // Retrieve donor ID
        const db = new Database(path.join(testDirectory, `${dbName}.db`));
        const donorRecord = db.prepare('SELECT donor_id FROM donors').get() as { donor_id: number };
        const donorId = donorRecord.donor_id;

        // Create a task for the donor and event
        const [taskCode, taskMessage] = taskManager.createTasksForEvent(eventId, [donorId]);
        expect(taskCode).toBe(200);

        // Retrieve the created task
        const taskRecord = db.prepare('SELECT task_id FROM tasks WHERE event_id = ? AND donor_id = ?').get(eventId, donorId) as { task_id: number };
        const taskId = taskRecord.task_id;

        // Update the task status to "rejected" with a reason
        const rejectionReason = 'Incomplete donor details';
        const [updateCode, updateMessage] = taskManager.updateTaskStatus(taskId, 'rejected', rejectionReason);
        expect(updateCode).toBe(200);
        expect(updateMessage).toBe(`Task ${taskId} updated to rejected.`);

        // Verify the task status and reason in the database
        const updatedTask = db.prepare('SELECT * FROM tasks WHERE task_id = ?').get(taskId) as TaskSchema;
        expect(updatedTask.status).toBe('rejected');
        expect(updatedTask.reason).toBe(rejectionReason);

        db.close(); // Close the database connection
    });
});


describe('Task Retrieval by PMM Tests', () => {
    test('should retrieve tasks only for donors assigned to a specific PMM', () => {
        // Initialize SQLite container
        const dbName = 'test_db_task_by_pmm';
        const taskManager = new SQLiteContainer(dbName);

        // Add a sample event
        const event = {
            name: 'Spring Fundraiser',
            location: 'Denver',
            date: '2024-03-20',
            description: 'A spring fundraising event for charity.'
        };
        const [eventCode, eventMessage] = taskManager.addEvent(event);
        const eventId = parseInt(eventMessage.split('ID: ')[1]);

        expect(eventCode).toBe(200);

        // Define and add sample donors with different PMMs
        const donors: DonorSchema[] = [
            { donor_id: 0, first_name: 'Alice', nick_name: '', last_name: 'Johnson', pmm: 'PMM100', organization_name: 'CharityOrg A', city: 'Denver', total_donations: 500 },
            { donor_id: 0, first_name: 'Bob', nick_name: '', last_name: 'Smith', pmm: 'PMM100', organization_name: 'CharityOrg B', city: 'Denver', total_donations: 300 },
            { donor_id: 0, first_name: 'Charlie', nick_name: '', last_name: 'Brown', pmm: 'PMM200', organization_name: 'CharityOrg C', city: 'Denver', total_donations: 400 }
        ];
        const [donorCode, donorMessage] = taskManager.addDonors(donors);
        expect(donorCode).toBe(200);

        // Retrieve donor IDs for task creation
        const db = new Database(path.join(testDirectory, `${dbName}.db`));
        const donorRecords = db.prepare('SELECT donor_id, pmm FROM donors').all() as { donor_id: number; pmm: string }[];
        const donorIdsForPMM100 = donorRecords.filter(record => record.pmm === 'PMM100').map(record => record.donor_id);

        // Create tasks for each donor related to the event
        const [taskCode, taskMessage] = taskManager.createTasksForEvent(eventId, donorIdsForPMM100);
        expect(taskCode).toBe(200);
        expect(taskMessage).toBe(`Tasks created for event ID: ${eventId}`);

        // Fetch tasks for PMM100 and verify they only include tasks for PMM100 donors
        const [fetchCode, tasks] = taskManager.getTasksByPMM('PMM100');
        expect(fetchCode).toBe(200);
        expect(Array.isArray(tasks)).toBe(true);
        const tasksArray = tasks as TaskSchema[];

        // Verify each task is related to PMM100's donors
        expect(tasksArray.length).toBe(donorIdsForPMM100.length);
        tasksArray.forEach(task => {
            expect(donorIdsForPMM100).toContain(task.donor_id);
            expect(task.event_id).toBe(eventId);
            expect(task.status).toBe('pending');
        });

        db.close(); // Close the database connection
    });

    test('should return an empty list if PMM has no assigned donors', () => {
        const dbName = 'test_db_task_no_pmm_donors';
        const taskManager = new SQLiteContainer(dbName);

        // Try to fetch tasks for a non-existent PMM
        const [fetchCode, tasks] = taskManager.getTasksByPMM('PMM999');
        expect(fetchCode).toBe(200);
        expect(tasks).toEqual([]); // Expect an empty array since no tasks should match this PMM
    });
});


describe('Task Retrieval by Event Tests', () => {
    test('should retrieve tasks only for a specific event', () => {
        // Initialize SQLite container
        const dbName = 'test_db_task_by_event';
        const taskManager = new SQLiteContainer(dbName);

        // Define and add a sample event
        const event = {
            name: 'Autumn Charity',
            location: 'San Francisco',
            date: '2024-09-15',
            description: 'A charity event for autumn.'
        };
        const [eventCode, eventMessage] = taskManager.addEvent(event);
        const eventId = parseInt(eventMessage.split('ID: ')[1]);

        expect(eventCode).toBe(200);

        // Define and add sample donors
        const donors: Omit<DonorSchema, 'donor_id'>[] = [
            { first_name: 'Daisy', nick_name: '', last_name: 'Miller', pmm: 'PMM300', organization_name: 'Helping Hands', city: 'San Francisco', total_donations: 200 },
            { first_name: 'Jack', nick_name: '', last_name: 'Johnson', pmm: 'PMM300', organization_name: 'Care Foundation', city: 'San Francisco', total_donations: 350 }
        ];
        const [donorCode, donorMessage] = taskManager.addDonors(donors);
        expect(donorCode).toBe(200);

        // Retrieve donor IDs from the database to use in task creation
        const db = new Database(path.join(testDirectory, `${dbName}.db`));
        const donorRecords = db.prepare('SELECT donor_id FROM donors').all() as { donor_id: number }[];
        const donorIds = donorRecords.map(record => record.donor_id);

        // Create tasks for each donor related to the event
        const [taskCode, taskMessage] = taskManager.createTasksForEvent(eventId, donorIds);
        expect(taskCode).toBe(200);
        expect(taskMessage).toBe(`Tasks created for event ID: ${eventId}`);

        // Fetch tasks by event ID and verify they only include tasks for this event
        const [fetchCode, tasks] = taskManager.getTasksByEvent(eventId);
        expect(fetchCode).toBe(200);
        expect(Array.isArray(tasks)).toBe(true);

        const tasksArray = tasks as TaskSchema[];

        // Verify each task is associated with the correct event and has the correct status
        expect(tasksArray.length).toBe(donorIds.length);
        tasksArray.forEach(task => {
            expect(task.event_id).toBe(eventId);
            expect(task.status).toBe('pending');
            expect(donorIds).toContain(task.donor_id);
        });

        db.close(); // Close the database connection
    });

    test('should return an empty list if no tasks are associated with the event', () => {
        const dbName = 'test_db_task_no_event_tasks';
        const taskManager = new SQLiteContainer(dbName);

        // Attempt to fetch tasks for a non-existent event ID
        const nonExistentEventId = 999;
        const [fetchCode, tasks] = taskManager.getTasksByEvent(nonExistentEventId);

        expect(fetchCode).toBe(200);
        expect(tasks).toEqual([]); // Expect an empty array since no tasks should match this event ID
    });
});
