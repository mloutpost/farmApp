import { db } from "@/lib/firebase";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import type { SubscriptionTier } from "@/types";
import { TIER_LIMITS } from "@/types";

export type TeamRole = "owner" | "manager" | "worker" | "viewer";

export interface TeamMember {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: TeamRole;
  joinedAt: string;
  lastActiveAt?: string;
}

export interface FarmTeam {
  id: string;
  farmId: string;
  ownerId: string;
  name: string;
  members: TeamMember[];
  invites: TeamInvite[];
  createdAt: string;
}

export interface TeamInvite {
  id: string;
  email: string;
  role: TeamRole;
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
  status: "pending" | "accepted" | "declined" | "expired";
}

export const ROLE_PERMISSIONS: Record<TeamRole, string[]> = {
  owner: ["*"],
  manager: ["read", "write", "manage-tasks", "manage-finances", "invite-members"],
  worker: ["read", "write", "manage-tasks", "log-activity", "log-harvest"],
  viewer: ["read"],
};

type UserInfo = {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
};

export async function createTeam(farmId: string, owner: UserInfo): Promise<string> {
  const teamRef = doc(collection(db, "teams"));
  const now = new Date().toISOString();

  const team: FarmTeam = {
    id: teamRef.id,
    farmId,
    ownerId: owner.uid,
    name: `${owner.displayName ?? owner.email}'s Farm Team`,
    members: [
      {
        uid: owner.uid,
        email: owner.email,
        displayName: owner.displayName,
        photoURL: owner.photoURL,
        role: "owner",
        joinedAt: now,
      },
    ],
    invites: [],
    createdAt: now,
  };

  await setDoc(teamRef, team);
  return teamRef.id;
}

export async function inviteMember(
  teamId: string,
  email: string,
  role: TeamRole,
  invitedBy: string,
): Promise<string> {
  const teamRef = doc(db, "teams", teamId);
  const snap = await getDoc(teamRef);
  if (!snap.exists()) throw new Error(`Team ${teamId} not found`);

  const team = snap.data() as FarmTeam;
  if (team.members.some((m) => m.email === email)) {
    throw new Error(`${email} is already a team member`);
  }
  if (team.invites.some((i) => i.email === email && i.status === "pending")) {
    throw new Error(`A pending invite already exists for ${email}`);
  }

  const now = new Date();
  const invite: TeamInvite = {
    id: crypto.randomUUID(),
    email,
    role,
    invitedBy,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: "pending",
  };

  await updateDoc(teamRef, { invites: arrayUnion(invite) });
  return invite.id;
}

export async function acceptInvite(
  teamId: string,
  inviteId: string,
  user: UserInfo,
): Promise<void> {
  const teamRef = doc(db, "teams", teamId);
  const snap = await getDoc(teamRef);
  if (!snap.exists()) throw new Error(`Team ${teamId} not found`);

  const team = snap.data() as FarmTeam;
  const invite = team.invites.find((i) => i.id === inviteId);
  if (!invite) throw new Error(`Invite ${inviteId} not found`);
  if (invite.status !== "pending") throw new Error(`Invite is already ${invite.status}`);
  if (new Date(invite.expiresAt) < new Date()) throw new Error("Invite has expired");

  const updatedInvites = team.invites.map((i) =>
    i.id === inviteId ? { ...i, status: "accepted" as const } : i,
  );

  const newMember: TeamMember = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    role: invite.role,
    joinedAt: new Date().toISOString(),
  };

  await updateDoc(teamRef, {
    invites: updatedInvites,
    members: arrayUnion(newMember),
  });
}

export async function removeMember(teamId: string, uid: string): Promise<void> {
  const teamRef = doc(db, "teams", teamId);
  const snap = await getDoc(teamRef);
  if (!snap.exists()) throw new Error(`Team ${teamId} not found`);

  const team = snap.data() as FarmTeam;
  const member = team.members.find((m) => m.uid === uid);
  if (!member) throw new Error(`Member ${uid} not found`);
  if (member.role === "owner") throw new Error("Cannot remove the team owner");

  await updateDoc(teamRef, { members: arrayRemove(member) });
}

export async function updateMemberRole(
  teamId: string,
  uid: string,
  newRole: TeamRole,
): Promise<void> {
  const teamRef = doc(db, "teams", teamId);
  const snap = await getDoc(teamRef);
  if (!snap.exists()) throw new Error(`Team ${teamId} not found`);

  const team = snap.data() as FarmTeam;
  const idx = team.members.findIndex((m) => m.uid === uid);
  if (idx === -1) throw new Error(`Member ${uid} not found`);
  if (team.members[idx].role === "owner") throw new Error("Cannot change the owner's role");

  const updatedMembers = team.members.map((m) =>
    m.uid === uid ? { ...m, role: newRole } : m,
  );

  await updateDoc(teamRef, { members: updatedMembers });
}

export async function getTeamForFarm(farmId: string): Promise<FarmTeam | null> {
  const q = query(collection(db, "teams"), where("farmId", "==", farmId));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as FarmTeam;
}

export function hasPermission(role: TeamRole, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[role];
  return perms.includes("*") || perms.includes(permission);
}
