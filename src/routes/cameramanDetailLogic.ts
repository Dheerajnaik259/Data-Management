import { Shoot } from '../types';

export interface CameramanAssignmentItem {
  shoot: Shoot;
  amount: number | null;
  paid: boolean;
  paidAt?: string | null;
  assignmentIndex: number;
}

export function getCameramanAssignments(shoots: Shoot[], cameramanId: string): CameramanAssignmentItem[] {
  const assignments: CameramanAssignmentItem[] = [];

  shoots.forEach(shoot => {
    if (!shoot.assignments) return;
    shoot.assignments.forEach((assignment, assignmentIndex) => {
      if (assignment.cameramanId === cameramanId) {
        assignments.push({
          shoot,
          amount: assignment.amount,
          paid: assignment.paid,
          paidAt: assignment.paidAt,
          assignmentIndex,
        });
      }
    });
  });

  return assignments;
}

export function getPendingCameramanRates(assignments: CameramanAssignmentItem[]): CameramanAssignmentItem[] {
  return assignments.filter(assignment => assignment.amount === null);
}
