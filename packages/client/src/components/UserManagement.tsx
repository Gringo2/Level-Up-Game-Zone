import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { Edit2, Trash2, Loader2 } from 'lucide-react';

interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'manager' | 'staff';
}

export function UserManagement() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsub = onSnapshot(q, (snap) => {
      setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as AppUser)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleUpdateRole = async (user: AppUser, newRole: 'admin' | 'manager' | 'staff') => {
    try {
      const oldRole = user.role;
      await updateDoc(doc(db, 'users', user.uid), { role: newRole });
      await addDoc(collection(db, 'audit_logs'), {
        table_affected: 'users',
        record_id: user.uid,
        old_value: { ...user, role: oldRole },
        new_value: { ...user, role: newRole },
        reason_for_change: `Role updated from ${oldRole} to ${newRole}`,
        user_id: auth.currentUser?.uid,
        timestamp: new Date().toISOString()
      });
      toast.success('Role updated successfully!');
    } catch (err) {
      toast.error('Failed to update role.');
    }
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
      <Card>
        <CardHeader>
          <CardTitle>Staff Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-500 uppercase bg-zinc-50 border-b">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map(user => (
                <tr key={user.uid} className="border-b last:border-0">
                  <td className="px-4 py-3">{user.displayName}</td>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">
                    <select 
                      value={user.role} 
                      onChange={(e) => handleUpdateRole(user, e.target.value as any)}
                      className="bg-zinc-50 border border-zinc-300 text-zinc-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    >
                      <option value="admin">Admin</option>
                      <option value="manager">Manager</option>
                      <option value="staff">Staff</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-800">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
