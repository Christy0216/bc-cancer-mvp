// TaskManagerInterfaceTests.ts
import { TaskContainerInterface, EventSchema, DonorSchema, TaskSchema } from '../src/Types';

export const runTaskManagerTests = (createTaskManager: () => TaskContainerInterface) => {
    describe('Task Manager Interface Tests', () => {
        
        test('should add an event successfully', () => {
            const eventManager = createTaskManager();
            const event = {
                name: 'Charity Gala',
                location: 'New York',
                date: '2024-11-20',
                description: 'An exclusive charity gala to support cancer research.',
            };
            const [code, message] = eventManager.addEvent(event);
            expect(code).toBe(200);
            expect(message).toMatch(/Event added with ID/);
        });

        test('should add donors successfully', () => {
            const donorManager = createTaskManager();
            const donors: Omit<DonorSchema, 'donor_id'>[] = [
                { first_name: 'Carlos', nick_name: 'Charlie', last_name: 'Smith', pmm: 'PMM123', organization_name: 'Helping Hands Inc.', city: 'Los Angeles', total_donations: 5000 },
                { first_name: 'Maria', nick_name: 'Mia', last_name: 'Johnson', pmm: 'PMM456', organization_name: 'Bright Future Foundation', city: 'San Francisco', total_donations: 7500 }
            ];
            const [code, message] = donorManager.addDonors(donors);
            expect(code).toBe(200);
            expect(message).toBe('Donors added successfully.');
        });

        test('should create tasks for each donor related to a specific event', () => {
            const taskManager = createTaskManager();
            const event = {
                name: 'Annual Fundraiser',
                location: 'Chicago',
                date: '2024-11-25',
                description: 'A fundraiser event for charity.'
            };
            const [eventCode, eventMessage] = taskManager.addEvent(event);
            const eventId = parseInt(eventMessage.split('ID: ')[1]);

            const donors: Omit<DonorSchema, 'donor_id'>[] = [
                { first_name: 'John', nick_name: '', last_name: 'Doe', pmm: 'PMM1', organization_name: 'Org1', city: 'Chicago', total_donations: 100 },
                { first_name: 'Jane', nick_name: '', last_name: 'Smith', pmm: 'PMM2', organization_name: 'Org2', city: 'New York', total_donations: 150 }
            ];
            const [donorCode, donorMessage] = taskManager.addDonors(donors);
            expect(donorCode).toBe(200);
            expect(donorMessage).toBe('Donors added successfully.');

            const donorIds = donors.map((_, index) => index + 1);  // Assuming IDs are sequentially assigned

            const [taskCode, taskMessage] = taskManager.createTasksForEvent(eventId, donorIds);
            expect(taskCode).toBe(200);
            expect(taskMessage).toBe(`Tasks created for event ID: ${eventId}`);
        });

        test('should update task status', () => {
            const taskManager = createTaskManager();

            // Setup: create event, donor, and task
            const event = { name: 'Gala Event', location: 'NY', date: '2024-11-25', description: 'Charity event' };
            const [eventCode, eventMessage] = taskManager.addEvent(event);
            const eventId = parseInt(eventMessage.split('ID: ')[1]);

            const donors: Omit<DonorSchema, 'donor_id'>[] = [{ first_name: 'Alice', nick_name: '', last_name: 'Green', pmm: 'PMM100', organization_name: 'Charity Org', city: 'LA', total_donations: 1000 }];
            taskManager.addDonors(donors);
            const donorIds = donors.map((_, index) => index + 1);
            taskManager.createTasksForEvent(eventId, donorIds);

            // Get task ID for verification
            const [taskFetchCode, tasks] = taskManager.getTasksByEvent(eventId);
            const taskId = (tasks[0] as TaskSchema).task_id;

            // Test updating task status
            const [updateCode, updateMessage] = taskManager.updateTaskStatus(taskId, 'approved');
            expect(updateCode).toBe(200);
            expect(updateMessage).toBe(`Task ${taskId} updated to approved.`);
        });

        test('should retrieve tasks by PMM', () => {
            const taskManager = createTaskManager();

            // Setup: create event, donors, and tasks
            const event = { name: 'Donor Event', location: 'SF', date: '2024-12-01', description: 'Donation drive' };
            const [eventCode, eventMessage] = taskManager.addEvent(event);
            const eventId = parseInt(eventMessage.split('ID: ')[1]);

            const donors: Omit<DonorSchema, 'donor_id'>[] = [
                { first_name: 'Bob', nick_name: '', last_name: 'Brown', pmm: 'PMM100', organization_name: 'Org1', city: 'LA', total_donations: 500 },
                { first_name: 'Sue', nick_name: '', last_name: 'Smith', pmm: 'PMM100', organization_name: 'Org2', city: 'SF', total_donations: 700 },
            ];
            taskManager.addDonors(donors);
            const donorIds = donors.map((_, index) => index + 1);
            taskManager.createTasksForEvent(eventId, donorIds);

            // Test retrieving tasks by PMM
            const [fetchCode, tasks] = taskManager.getTasksByPMM('PMM100');
            expect(fetchCode).toBe(200);
            expect(tasks).toHaveLength(donorIds.length);
            if (Array.isArray(tasks)) {
                tasks.forEach((task: TaskSchema) => {
                    expect(task.event_id).toBe(eventId);
                    expect(task.status).toBe('pending');
                });
            } else {
                throw new Error('Expected tasks to be an array');
            }
        });

        test('should retrieve tasks by event ID', () => {
            const taskManager = createTaskManager();

            // Setup: create event, donors, and tasks
            const event = { name: 'End of Year Event', location: 'Boston', date: '2024-12-15', description: 'Annual fundraiser' };
            const [eventCode, eventMessage] = taskManager.addEvent(event);
            const eventId = parseInt(eventMessage.split('ID: ')[1]);

            const donors: Omit<DonorSchema, 'donor_id'>[] = [
                { first_name: 'Tom', nick_name: '', last_name: 'White', pmm: 'PMM200', organization_name: 'OrgA', city: 'Boston', total_donations: 600 },
                { first_name: 'Jerry', nick_name: '', last_name: 'Mouse', pmm: 'PMM200', organization_name: 'OrgB', city: 'NY', total_donations: 800 },
            ];
            taskManager.addDonors(donors);
            const donorIds = donors.map((_, index) => index + 1);
            taskManager.createTasksForEvent(eventId, donorIds);

            // Test retrieving tasks by event ID
            const [fetchCode, tasks] = taskManager.getTasksByEvent(eventId);
            expect(fetchCode).toBe(200);
            expect(tasks).toHaveLength(donorIds.length);
            if (Array.isArray(tasks)) {
                tasks.forEach(task => {
                    expect(task.event_id).toBe(eventId);
                    expect(task.status).toBe('pending');
                });
            } else {
                throw new Error('Expected tasks to be an array');
            }
        });
    });
};
