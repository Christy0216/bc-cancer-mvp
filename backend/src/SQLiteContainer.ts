import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { EventSchema, DonorSchema, TaskSchema, DatabaseResponse, TaskContainerInterface} from './Types';

/**
 * Class representing a SQLite container for managing events, donors, and tasks.
 */
class SQLiteContainer implements TaskContainerInterface {
    private db: Database.Database; // The SQLite database instance
    private dbFilename: string; // The filename of the SQLite database

    /**
     * Constructor for SQLiteContainer.
     * @param database - The name of the database file.
     */
    constructor(database: string) {
        const dataPath = path.join(__dirname, '..');
        this.dbFilename = path.join(dataPath, database + '.db');
        console.log(`Database file path: ${this.dbFilename}`);

        if (!fs.existsSync(this.dbFilename)) {
            console.log('Database file does not exist. Creating a new one.');
            fs.writeFileSync(this.dbFilename, '');
        }

        this.db = new Database(this.dbFilename);
        console.log('Database opened successfully.');
        this.initializeDatabase();
    }

    /**
     * Initializes the database schema by creating the necessary tables.
     */
    private initializeDatabase() {
        // Enable foreign key constraints
        this.db.exec(`PRAGMA foreign_keys = ON;`);

        // Create events table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS events (
                event_id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                location TEXT,
                date TEXT,
                description TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Events table created or already exist.');

        // Create donors table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS donors (
                donor_id INTEGER PRIMARY KEY AUTOINCREMENT,
                first_name TEXT,
                nick_name TEXT,
                last_name TEXT,
                pmm TEXT NOT NULL,
                organization_name TEXT,
                city TEXT,
                total_donations INTEGER,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Donors table created or already exist.');

        // Create tasks table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS tasks (
                task_id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_id INTEGER,
                donor_id INTEGER,
                status TEXT CHECK(status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
                reason TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (event_id) REFERENCES events(event_id),
                FOREIGN KEY (donor_id) REFERENCES donors(donor_id)
            );
        `);
        console.log('Tasks table created or already exist.');

        const result = this.db.prepare('PRAGMA table_info(events);').all();
        console.log(result);
    }

    /**
     * Fetches all events from the database.
     * @returns A tuple containing the status code and an array of EventSchema objects.
     */
    public getEvents(): DatabaseResponse<EventSchema[]> {
        const sqlQuery = `
        SELECT * FROM events
    `;
        try {
            const rows = this.db.prepare(sqlQuery).all() as EventSchema[];
            return [200, rows];
        } catch (error) {
            console.error('Error fetching events:', (error as Error).message);
            return [500, `An error occurred: ${(error as Error).message}`];
        }
    }

    /**
     * Adds a new event to the database.
     * @param event - The event object containing event details.
     * @returns A tuple containing the status code and a message.
     */
    public addEvent(event: Omit<EventSchema, 'event_id'|'created_at'>): DatabaseResponse<number> {
        const sqlQuery = `
            INSERT INTO events (name, location, date, description)
            VALUES (?, ?, ?, ?)
        `;
        try {
            const stmt = this.db.prepare(sqlQuery);
            const result = stmt.run(event.name, event.location, event.date, event.description);
            return [200, result.lastInsertRowid as number]; // Directly return the ID as a number
        } catch (error) {
            console.error('Error adding event:', (error as Error).message);
            return [500, `An error occurred: ${(error as Error).message}`];
        }
    }


    /**
     * Fetches all donors from the database.
     * @returns A tuple containing the status code and an array of DonorSchema objects.
     */
    public getDonors(): DatabaseResponse<DonorSchema[]> {
        const sqlQuery = `
        SELECT * FROM donors
    `;
        try {
            const rows = this.db.prepare(sqlQuery).all() as DonorSchema[];
            return [200, rows];
        } catch (error) {
            console.error('Error fetching donors:', (error as Error).message);
            return [500, `An error occurred: ${(error as Error).message}`];
        }
    }

    /**
     * Fetches donors by name from the database.
     * @returns A tuple containing the status code and a DonorSchema object or a message.
     */
    public findDonorByName(firstName: string, lastName: string): DatabaseResponse<DonorSchema> {
        const sqlQuery = `
    SELECT * FROM donors
    WHERE first_name = ? AND last_name = ?
    `;
        try {
            const row = this.db.prepare(sqlQuery).get(firstName, lastName) as DonorSchema | undefined;

            if (row) {
                return [200, row];
            } else {
                return [404, "Donor not found"];  // Return 404 if no donor is found
            }
        } catch (error) {
            console.error('Error fetching donors by name:', (error as Error).message);
            return [500, `An error occurred: ${(error as Error).message}`];
        }
    }

    /**
     * Add a donor to the database.
     * @param donor - The donor object.
     * @returns the donor_id of the newly added donor.
     */
    public addDonor(donor: Omit<DonorSchema, 'donor_id'|'created_at'>): [number, number] {
        const sqlQuery = `
        INSERT INTO donors (first_name, nick_name, last_name, pmm, organization_name, city, total_donations)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
        try {
            const stmt = this.db.prepare(sqlQuery);
            const result = stmt.run(
                donor.first_name,
                donor.nick_name,
                donor.last_name,
                donor.pmm,
                donor.organization_name,
                donor.city,
                donor.total_donations
            );
            return [200, result.lastInsertRowid as number];
        } catch (error) {
            console.error('Error adding donor:', (error as Error).message);
            return [500, -1];
        }
    }


    /**
     * Adds a list of donors to the database.
     * @param donors - An array of donor objects.
     * @returns A tuple containing the status code and a message.
     */
    public addDonors(donors: Omit<DonorSchema, 'donor_id'|'created_at'>[]): [number, string] {
        const sqlQuery = `
        INSERT INTO donors (first_name, nick_name, last_name, pmm, organization_name, city, total_donations)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
        try {
            const insertDonor = this.db.prepare(sqlQuery);
            const transaction = this.db.transaction((donorList: Omit<DonorSchema, 'donor_id'|'created_at'>[]) => {
                donorList.forEach(donor => {
                    insertDonor.run(
                        donor.first_name,
                        donor.nick_name,
                        donor.last_name,
                        donor.pmm,
                        donor.organization_name,
                        donor.city,
                        donor.total_donations
                    );
                });
            });
            transaction(donors);
            return [200, `Donors added successfully.`];
        } catch (error) {
            console.error('Error adding donors:', (error as Error).message);
            return [500, `An error occurred: ${(error as Error).message}`];
        }
    }

    /**
     * Creates tasks for each donor related to a specific event.
     * @param eventId - The ID of the event.
     * @param donorIds - Array of donor IDs to create tasks for.
     * @returns A tuple containing the status code and a message.
     */
    public createTasksForEvent(eventId: number, donorIds: number[]): [number, string] {
        const sqlQuery = `
            INSERT INTO tasks (event_id, donor_id, status)
            VALUES (?, ?, 'pending')
        `;
        try {
            const insertTask = this.db.prepare(sqlQuery);
            const transaction = this.db.transaction((donors: number[]) => {
                donors.forEach(donorId => insertTask.run(eventId, donorId));
            });
            transaction(donorIds);
            return [200, `Tasks created for event ID: ${eventId}`];
        } catch (error) {
            console.error('Error creating tasks:', (error as Error).message);
            return [500, `An error occurred: ${(error as Error).message}`];
        }
    }

    /**
     * Updates a task status to approved or rejected, with a reason if rejected.
     * @param taskId - The ID of the task.
     * @param status - The new status ('approved' or 'rejected').
     * @param reason - Optional reason for rejection.
     */
    public updateTaskStatus(taskId: number, status: 'approved' | 'rejected', reason?: string): [number, string] {
        const sqlQuery = `
            UPDATE tasks
            SET status = ?, reason = ?
            WHERE task_id = ?
        `;
        try {
            this.db.prepare(sqlQuery).run(status, reason || null, taskId);
            return [200, `Task ${taskId} updated to ${status}.`];
        } catch (error) {
            console.error('Error updating task:', (error as Error).message);
            return [500, `An error occurred: ${(error as Error).message}`];
        }
    }

    /**
     * Fetches all tasks from the database.
     * @returns A tuple containing the status code and an array of TaskSchema objects.
     */
    public getTasks(): DatabaseResponse<TaskSchema[]> {
        const sqlQuery = `
            SELECT 
                tasks.task_id,
                tasks.event_id,
                tasks.donor_id,
                tasks.status,
                tasks.reason,
                tasks.created_at,
                donors.first_name,
                donors.nick_name,
                donors.last_name,
                donors.pmm,
                donors.organization_name,
                donors.city,
                donors.total_donations
            FROM tasks
            JOIN donors ON tasks.donor_id = donors.donor_id
        `;
        try {
            const rows = this.db.prepare(sqlQuery).all() as TaskSchema[];
            return [200, rows];
        } catch (error) {
            console.error('Error fetching tasks:', (error as Error).message);
            return [500, `An error occurred: ${(error as Error).message}`];
        }
    }

    /**
     * Fetches all tasks for a specific PMM, allowing them to view tasks only for their assigned donors.
     * @param pmm - The PMM responsible for the donors.
     */
    public getTasksByPMM(pmm: string): DatabaseResponse<TaskSchema[]> {
        const sqlQuery = `
            SELECT 
                tasks.task_id,
                tasks.event_id,
                tasks.donor_id,
                tasks.status,
                tasks.reason,
                tasks.created_at,
                donors.first_name,
                donors.nick_name,
                donors.last_name,
                donors.pmm,
                donors.organization_name,
                donors.city,
                donors.total_donations
            FROM tasks
            JOIN donors ON tasks.donor_id = donors.donor_id
            WHERE donors.pmm = ?
        `;
        try {
            const rows = this.db.prepare(sqlQuery).all(pmm) as TaskSchema[];
            return [200, rows];
        } catch (error) {
            console.error('Error fetching tasks for PMM:', (error as Error).message);
            return [500, `An error occurred: ${(error as Error).message}`];
        }
    }

    /**
     * Fetches all tasks for a specific event.
     * @param eventId - The ID of the event.
     */
    public getTasksByEvent(eventId: number): DatabaseResponse<TaskSchema[]> {
        const sqlQuery = `
            SELECT 
                tasks.task_id,
                tasks.event_id,
                tasks.donor_id,
                tasks.status,
                tasks.reason,
                tasks.created_at,
                donors.first_name,
                donors.nick_name,
                donors.last_name,
                donors.pmm,
                donors.organization_name,
                donors.city,
                donors.total_donations
            FROM tasks
            JOIN donors ON tasks.donor_id = donors.donor_id
            WHERE tasks.event_id = ?
        `;
        try {
            const rows = this.db.prepare(sqlQuery).all(eventId) as TaskSchema[];
            return [200, rows];
        } catch (error) {
            console.error('Error fetching tasks for event:', (error as Error).message);
            return [500, `An error occurred: ${(error as Error).message}`];
        }
    }
    public getTasksAndDonorsByEvent(eventId: number): DatabaseResponse<TaskSchema[]> {
        const sqlQuery = `
            SELECT 
                tasks.task_id,
                tasks.event_id,
                tasks.donor_id,
                tasks.status,
                tasks.reason,
                tasks.created_at,
                donors.first_name,
                donors.nick_name,
                donors.last_name,
                donors.pmm,
                donors.organization_name,
                donors.city,
                donors.total_donations
            FROM tasks
            JOIN donors ON tasks.donor_id = donors.donor_id
            WHERE tasks.event_id = ?
        `;
        try {
            const rows = this.db.prepare(sqlQuery).all(eventId) as TaskSchema[];
            return [200, rows];
        } catch (error) {
            console.error('Error fetching tasks for event:', (error as Error).message);
            return [500, `An error occurred: ${(error as Error).message}`];
        }
    }
}



export default SQLiteContainer;
