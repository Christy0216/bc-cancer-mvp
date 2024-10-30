import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

/**
 * Interfaces representing the structure of each table's data.
 */
interface EventSchema {
    event_id: number;
    name: string;
    location: string;
    date: string;
    description: string;
}

interface DonorSchema {
    donor_id: number;
    first_name: string;
    last_name: string;
    city: string;
    total_donations: number;
    pmm: string; // The Project Manager responsible for this donor
    // other donor fields...
}

interface TaskSchema {
    task_id: number;
    event_id: number;
    donor_id: number;
    status: string;
    reason: string | null;
}

/**
 * Class representing a SQLite container for managing events, donors, and tasks.
 */
class SQLiteContainer {
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
        // Create events table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS events (
                event_id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                location TEXT,
                date TEXT,
                description TEXT
            );
        `);
        console.log('Events table created or already exist.');
        
        // Create donors table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS donors (
                donor_id INTEGER PRIMARY KEY AUTOINCREMENT,
                first_name TEXT,
                last_name TEXT,
                city TEXT,
                total_donations INTEGER,
                pmm TEXT NOT NULL
                -- other fields as needed
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
                FOREIGN KEY (event_id) REFERENCES events(event_id),
                FOREIGN KEY (donor_id) REFERENCES donors(donor_id)
            );
        `);
        console.log('Tasks table created or already exist.');
    }

    /**
     * Adds a new event to the database.
     * @param event - The event object containing event details.
     * @returns A tuple containing the status code and a message.
     */
    public addEvent(event: { name: string, location: string, date: string, description: string }): [number, string] {
        const sqlQuery = `
            INSERT INTO events (name, location, date, description)
            VALUES (?, ?, ?, ?)
        `;
        try {
            const stmt = this.db.prepare(sqlQuery);
            const result = stmt.run(event.name, event.location, event.date, event.description);
            return [200, `Event added with ID: ${result.lastInsertRowid}`];
        } catch (error) {
            console.error('Error adding event:', (error as Error).message);
            return [500, `An error occurred: ${(error as Error).message}`];
        }
    }

    // /**
    //  * Adds a list of donors to the database.
    //  * @param donors - An array of donor objects.
    //  */
    // public addDonors(donors: DonorSchema[]): [number, string] {
    //     const sqlQuery = `
    //         INSERT INTO donors (first_name, last_name, city, total_donations, pmm)
    //         VALUES (?, ?, ?, ?, ?)
    //     `;
    //     try {
    //         const insertDonor = this.db.prepare(sqlQuery);
    //         const transaction = this.db.transaction((donorList: DonorSchema[]) => {
    //             donorList.forEach(donor => insertDonor.run(donor.first_name, donor.last_name, donor.city, donor.total_donations, donor.pmm));
    //         });
    //         transaction(donors);
    //         return [200, `Donors added successfully.`];
    //     } catch (error) {
    //         console.error('Error adding donors:', (error as Error).message);
    //         return [500, `An error occurred: ${(error as Error).message}`];
    //     }
    // }

    // /**
    //  * Creates tasks for each donor related to a specific event.
    //  * @param eventId - The ID of the event.
    //  * @param donorIds - Array of donor IDs to create tasks for.
    //  * @returns A tuple containing the status code and a message.
    //  */
    // public createTasksForEvent(eventId: number, donorIds: number[]): [number, string] {
    //     const sqlQuery = `
    //         INSERT INTO tasks (event_id, donor_id, status)
    //         VALUES (?, ?, 'pending')
    //     `;
    //     try {
    //         const insertTask = this.db.prepare(sqlQuery);
    //         const transaction = this.db.transaction((donors: number[]) => {
    //             donors.forEach(donorId => insertTask.run(eventId, donorId));
    //         });
    //         transaction(donorIds);
    //         return [200, `Tasks created for event ID: ${eventId}`];
    //     } catch (error) {
    //         console.error('Error creating tasks:', (error as Error).message);
    //         return [500, `An error occurred: ${(error as Error).message}`];
    //     }
    // }

    // /**
    //  * Updates a task status to approved or rejected, with a reason if rejected.
    //  * @param taskId - The ID of the task.
    //  * @param status - The new status ('approved' or 'rejected').
    //  * @param reason - Optional reason for rejection.
    //  */
    // public updateTaskStatus(taskId: number, status: 'approved' | 'rejected', reason?: string): [number, string] {
    //     const sqlQuery = `
    //         UPDATE tasks
    //         SET status = ?, reason = ?
    //         WHERE task_id = ?
    //     `;
    //     try {
    //         this.db.prepare(sqlQuery).run(status, reason || null, taskId);
    //         return [200, `Task ${taskId} updated to ${status}.`];
    //     } catch (error) {
    //         console.error('Error updating task:', (error as Error).message);
    //         return [500, `An error occurred: ${(error as Error).message}`];
    //     }
    // }

    // /**
    //  * Fetches all tasks for a specific PMM, allowing them to view tasks only for their assigned donors.
    //  * @param pmm - The PMM responsible for the donors.
    //  */
    // public getTasksByPMM(pmm: string): [number, TaskSchema[] | string] {
    //     const sqlQuery = `
    //         SELECT t.* FROM tasks t
    //         JOIN donors d ON t.donor_id = d.donor_id
    //         WHERE d.pmm = ?
    //     `;
    //     try {
    //         const rows = this.db.prepare(sqlQuery).all(pmm) as TaskSchema[];
    //         return [200, rows];
    //     } catch (error) {
    //         console.error('Error fetching tasks for PMM:', (error as Error).message);
    //         return [500, `An error occurred: ${(error as Error).message}`];
    //     }
    // }
}

export default SQLiteContainer;
