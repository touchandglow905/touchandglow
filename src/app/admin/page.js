"use client";

import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase"; 
import { collection, addDoc, query, where, deleteDoc, doc, onSnapshot, updateDoc, getDocs } from "firebase/firestore";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { fullServices, fullSlots } from "@/lib/serviceData";
import { Calendar, Trash2, LogOut, LayoutDashboard, Plus, CheckCircle, Search, Settings, UploadCloud } from "lucide-react";

export default function AdminPage() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("bookings");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Data States
  const [bookings, setBookings] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  const [slotsList, setSlotsList] = useState([]);
  const [stats, setStats] = useState({ revenue: 0, total: 0, completed: 0 });

  // Auth Forms
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Add Forms
  const [serviceName, setServiceName] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [serviceCategory, setServiceCategory] = useState("Hair Cut");
  const [serviceType, setServiceType] = useState("Male");
  const [slotTime, setSlotTime] = useState("");

  // 1. Check Auth
  useEffect(() => {
    return onAuthStateChanged(auth, u => setUser(u));
  }, []);

  // 2. Fetch Bookings (Real-time)
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "bookings"), where("date", "==", selectedDate));
    return onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => a.slotTime.localeCompare(b.slotTime));
      setBookings(data);
      setStats({
        revenue: data.reduce((acc, curr) => acc + Number(curr.servicePrice || 0), 0),
        total: data.length,
        completed: data.filter(b => b.status === "completed").length
      });
    });
  }, [selectedDate, user]);

  // 3. Fetch Services & Slots (Real-time) - NEW FEATURE
  useEffect(() => {
    if (!user) return;
    // Fetch Services
    const unsubServices = onSnapshot(collection(db, "services"), (snap) => {
        setServicesList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    // Fetch Slots
    const unsubSlots = onSnapshot(collection(db, "slots"), (snap) => {
        setSlotsList(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => a.time.localeCompare(b.time)));
    });
    return () => { unsubServices(); unsubSlots(); };
  }, [user]);


  // --- ACTIONS ---
  const handleBulkUpload = async () => {
    if(!confirm("Are you sure? This will add ALL services and slots from the data file.")) return;
    
    try {
        // Upload Services
        for (const s of fullServices) {
            await addDoc(collection(db, "services"), s);
        }
        // Upload Slots
        for (const slot of fullSlots) {
            await addDoc(collection(db, "slots"), { ...slot, bookedCount: 0 });
        }
        alert("Success! All data uploaded.");
    } catch (e) {
        alert("Error uploading data: " + e.message);
    }
  };

  const handleDeleteService = async (id) => {
    if(confirm("Delete this service?")) await deleteDoc(doc(db, "services", id));
  };

  const handleDeleteSlot = async (id) => {
    if(confirm("Delete this time slot?")) await deleteDoc(doc(db, "slots", id));
  };

  const handleStatusUpdate = async (id, newStatus) => {
    await updateDoc(doc(db, "bookings", id), { status: newStatus });
  };

  const handleAddService = async (e) => {
    e.preventDefault();
    if(!serviceName || !servicePrice) return alert("Fill all details");
    await addDoc(collection(db, "services"), { name: serviceName, price: servicePrice, category: serviceCategory, type: serviceType });
    alert("Service Added"); setServiceName(""); setServicePrice("");
  };

  const handleAddSlot = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, "slots"), { time: slotTime, capacity: 2, bookedCount: 0 });
    alert("Slot Added");
  };

  if (!user) return (
    <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-96 border">
            <h1 className="text-2xl font-bold mb-6 text-center">Salon Admin</h1>
            <form onSubmit={e => { e.preventDefault(); signInWithEmailAndPassword(auth, email, password); }}>
                <input type="email" placeholder="Email" className="w-full p-3 border rounded-lg mb-3" onChange={e=>setEmail(e.target.value)}/>
                <input type="password" placeholder="Password" className="w-full p-3 border rounded-lg mb-4" onChange={e=>setPassword(e.target.value)}/>
                <button className="w-full bg-black text-white py-3 rounded-lg">Login</button>
            </form>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans">
      
      {/* Sidebar */}
      <div className="bg-white border-r w-full md:w-64 p-6 flex flex-col justify-between md:h-screen sticky top-0 h-auto">
        <div>
            <h1 className="text-2xl font-bold mb-8 tracking-tight">Touch & Glow</h1>
            <nav className="space-y-2">
                <button onClick={() => setActiveTab("bookings")} className={`w-full text-left p-3 rounded-lg flex items-center gap-3 font-medium transition ${activeTab==="bookings" ? "bg-black text-white shadow-md" : "text-gray-600 hover:bg-gray-100"}`}>
                    <LayoutDashboard size={20}/> Dashboard
                </button>
                <button onClick={() => setActiveTab("services")} className={`w-full text-left p-3 rounded-lg flex items-center gap-3 font-medium transition ${activeTab==="services" ? "bg-black text-white shadow-md" : "text-gray-600 hover:bg-gray-100"}`}>
                    <Settings size={20}/> Manage Shop
                </button>
            </nav>
        </div>
        <button onClick={() => signOut(auth)} className="flex items-center gap-2 text-red-500 font-medium mt-10 md:mt-0"><LogOut size={18}/> Logout</button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 md:p-10 overflow-y-auto">
        
        {/* TAB 1: BOOKINGS */}
        {activeTab === "bookings" && (
            <div className="animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h2 className="text-2xl font-bold">Today's Schedule</h2>
                        <p className="text-gray-500 text-sm">Real-time appointments</p>
                    </div>
                    <div className="flex items-center gap-2 bg-white p-2 rounded-xl border shadow-sm">
                        <Calendar size={18} className="text-gray-500 ml-2"/>
                        <input type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)} className="outline-none text-sm font-medium"/>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-white p-5 rounded-2xl border shadow-sm"><p className="text-gray-400 text-xs font-bold tracking-wider">REVENUE</p><h3 className="text-3xl font-bold mt-1">₹{stats.revenue}</h3></div>
                    <div className="bg-white p-5 rounded-2xl border shadow-sm"><p className="text-gray-400 text-xs font-bold tracking-wider">BOOKINGS</p><h3 className="text-3xl font-bold mt-1">{stats.total}</h3></div>
                    <div className="bg-white p-5 rounded-2xl border shadow-sm"><p className="text-gray-400 text-xs font-bold tracking-wider">COMPLETED</p><h3 className="text-3xl font-bold mt-1 text-green-600">{stats.completed}</h3></div>
                </div>

                <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b text-xs text-gray-500 uppercase font-bold"><tr><th className="p-4">Time</th><th className="p-4">Client</th><th className="p-4">Service</th><th className="p-4">Status</th><th className="p-4 text-right">Action</th></tr></thead>
                        <tbody className="divide-y">
                            {bookings.map(b => (
                                <tr key={b.id} className="hover:bg-gray-50 transition">
                                    <td className="p-4 font-mono font-bold text-lg">{b.slotTime}</td>
                                    <td className="p-4"><div className="font-bold text-gray-900">{b.customerName}</div><div className="text-xs text-gray-500">{b.customerPhone}</div></td>
                                    <td className="p-4 font-medium">{b.serviceName}</td>
                                    <td className="p-4"><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${b.status==='completed'?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700'}`}>{b.status||'Pending'}</span></td>
                                    <td className="p-4 text-right flex justify-end gap-2">
                                        <button onClick={()=>handleStatusUpdate(b.id, 'completed')} className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition"><CheckCircle size={18}/></button>
                                        <button onClick={async()=>{if(confirm("Delete?")) await deleteDoc(doc(db,"bookings",b.id))}} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"><Trash2 size={18}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {bookings.length === 0 && <div className="p-10 text-center text-gray-400">No bookings found for this date.</div>}
                </div>
            </div>
        )}

        {/* TAB 2: MANAGE SERVICES & SLOTS */}
        {activeTab === "services" && (
            <div className="animate-in fade-in duration-500 space-y-8">
                
                {/* BULK ACTION */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-2xl shadow-lg flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-lg">Initialize Shop Data</h3>
                        <p className="text-blue-100 text-sm">Click this once to upload full Menu & Time Slots (9 AM - 9 PM).</p>
                    </div>
                    <button onClick={handleBulkUpload} className="bg-white text-blue-700 px-6 py-3 rounded-xl font-bold hover:bg-blue-50 transition flex items-center gap-2 shadow-sm">
                        <UploadCloud size={20}/> Upload Bulk Data
                    </button>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                     {/* Services Management */}
                     <div className="space-y-6">
                        <div className="bg-white p-6 rounded-2xl border shadow-sm">
                            <h3 className="font-bold mb-4 flex items-center gap-2"><Plus size={18}/> Add New Service</h3>
                            <div className="space-y-3">
                                <select className="w-full p-3 border rounded-xl bg-gray-50" value={serviceType} onChange={e=>setServiceType(e.target.value)}>
                                    <option value="Male">Male</option><option value="Female">Female</option><option value="Kids">Kids</option>
                                </select>
                                <input className="w-full p-3 border rounded-xl bg-gray-50" placeholder="Name" value={serviceName} onChange={e=>setServiceName(e.target.value)}/>
                                <input className="w-full p-3 border rounded-xl bg-gray-50" placeholder="Category" value={serviceCategory} onChange={e=>setServiceCategory(e.target.value)}/>
                                <input className="w-full p-3 border rounded-xl bg-gray-50" placeholder="Price" type="number" value={servicePrice} onChange={e=>setServicePrice(e.target.value)}/>
                                <button onClick={handleAddService} className="w-full bg-black text-white py-3 rounded-xl font-bold">Add Service</button>
                            </div>
                        </div>

                        {/* LIST OF SERVICES */}
                        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                            <div className="p-4 border-b bg-gray-50 font-bold text-gray-500 text-xs uppercase">Existing Services ({servicesList.length})</div>
                            <div className="max-h-[500px] overflow-y-auto divide-y">
                                {servicesList.map(s => (
                                    <div key={s.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                                        <div>
                                            <p className="font-bold text-sm">{s.name}</p>
                                            <p className="text-xs text-gray-500">{s.category} • {s.type} • ₹{s.price}</p>
                                        </div>
                                        <button onClick={() => handleDeleteService(s.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                     </div>

                     {/* Slots Management */}
                     <div className="space-y-6">
                        <div className="bg-white p-6 rounded-2xl border shadow-sm h-fit">
                            <h3 className="font-bold mb-4 flex items-center gap-2"><Plus size={18}/> Add Time Slot</h3>
                            <div className="flex gap-2">
                                <input className="w-full p-3 border rounded-xl bg-gray-50" type="time" value={slotTime} onChange={e=>setSlotTime(e.target.value)}/>
                                <button onClick={handleAddSlot} className="bg-black text-white px-6 rounded-xl font-bold">Add</button>
                            </div>
                        </div>

                        {/* LIST OF SLOTS */}
                        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                            <div className="p-4 border-b bg-gray-50 font-bold text-gray-500 text-xs uppercase">Time Slots ({slotsList.length})</div>
                            <div className="max-h-[500px] overflow-y-auto divide-y">
                                {slotsList.map(s => (
                                    <div key={s.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                                        <p className="font-mono font-bold">{s.time}</p>
                                        <button onClick={() => handleDeleteSlot(s.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                     </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}