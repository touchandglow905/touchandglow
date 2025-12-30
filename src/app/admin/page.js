"use client";

import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase"; 
import { collection, addDoc, query, where, deleteDoc, doc, onSnapshot, updateDoc, getDocs } from "firebase/firestore";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { fullServices, fullSlots } from "@/lib/serviceData";
import { 
  Calendar, Trash2, LogOut, LayoutDashboard, Plus, CheckCircle, 
  Search, Settings, UploadCloud, Eye, Edit2, Clock, DollarSign, 
  Users, TrendingUp, ChevronRight, Menu, X, User, Phone, Mail,
  Briefcase, Tag, ShieldCheck, AlertCircle, Loader2, BarChart3,
  Filter, Download, MoreVertical, CheckSquare, Square, ArrowUpDown
} from "lucide-react";

export default function AdminPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("bookings");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Data States
  const [bookings, setBookings] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  const [slotsList, setSlotsList] = useState([]);
  const [stats, setStats] = useState({ 
    revenue: 0, 
    total: 0, 
    completed: 0,
    pending: 0,
    upcoming: 0
  });

  // Auth Forms
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Add Forms
  const [serviceName, setServiceName] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [serviceCategory, setServiceCategory] = useState("Hair Cut");
  const [serviceType, setServiceType] = useState("Male");
  const [serviceDuration, setServiceDuration] = useState("30");
  const [slotTime, setSlotTime] = useState("");
  const [slotCapacity, setSlotCapacity] = useState("2");
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [timeSort, setTimeSort] = useState("asc");

  // Selection
  const [selectedBookings, setSelectedBookings] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  // Check Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Fetch Bookings (Real-time)
  useEffect(() => {
    if (!user) return;
    
    const q = query(collection(db, "bookings"), where("date", "==", selectedDate));
    
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ 
        id: d.id, 
        ...d.data(),
        timestamp: d.data().createdAt?.toDate() || new Date()
      })).sort((a, b) => {
        // Sort by time then by creation date
        if (a.slotTime && b.slotTime) {
          return a.slotTime.localeCompare(b.slotTime);
        }
        return b.timestamp - a.timestamp;
      });
      
      const filteredData = data.filter(booking => {
        const matchesSearch = searchQuery === "" || 
          booking.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          booking.customerPhone.includes(searchQuery) ||
          booking.serviceName.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesStatus = statusFilter === "all" || booking.status === statusFilter;
        
        return matchesSearch && matchesStatus;
      });

      // Apply time sorting
      const sortedData = [...filteredData].sort((a, b) => {
        if (timeSort === "asc") {
          return (a.slotTime || "").localeCompare(b.slotTime || "");
        } else {
          return (b.slotTime || "").localeCompare(a.slotTime || "");
        }
      });
      
      setBookings(sortedData);
      
      // Calculate stats
      const totalRevenue = data.reduce((acc, curr) => acc + Number(curr.servicePrice || 0), 0);
      const totalBookings = data.length;
      const completedBookings = data.filter(b => b.status === "completed").length;
      const pendingBookings = data.filter(b => b.status === "pending").length;
      
      setStats({
        revenue: totalRevenue,
        total: totalBookings,
        completed: completedBookings,
        pending: pendingBookings,
        upcoming: totalBookings - completedBookings
      });
    }, (error) => {
      console.error("Error fetching bookings:", error);
    });
    
    return unsubscribe;
  }, [selectedDate, user, searchQuery, statusFilter, timeSort]);

  // Fetch Services & Slots (Real-time)
  useEffect(() => {
    if (!user) return;
    
    const unsubscribeServices = onSnapshot(collection(db, "services"), (snap) => {
      const services = snap.docs.map(d => ({ 
        id: d.id, 
        ...d.data() 
      })).sort((a, b) => a.name.localeCompare(b.name));
      setServicesList(services);
    });
    
    const unsubscribeSlots = onSnapshot(collection(db, "slots"), (snap) => {
      const slots = snap.docs.map(d => ({ 
        id: d.id, 
        ...d.data() 
      })).sort((a, b) => a.time.localeCompare(b.time));
      setSlotsList(slots);
    });
    
    return () => {
      unsubscribeServices();
      unsubscribeSlots();
    };
  }, [user]);

  // Handle selection
  const toggleSelectBooking = (id) => {
    if (selectedBookings.includes(id)) {
      setSelectedBookings(selectedBookings.filter(bookingId => bookingId !== id));
    } else {
      setSelectedBookings([...selectedBookings, id]);
    }
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedBookings([]);
    } else {
      setSelectedBookings(bookings.map(b => b.id));
    }
    setSelectAll(!selectAll);
  };

  // Actions
  const handleBulkUpload = async () => {
    if (!confirm("This will add ALL default services and time slots. Continue?")) return;
    
    try {
      // Check if services already exist
      const existingServices = await getDocs(collection(db, "services"));
      if (existingServices.docs.length > 0) {
        if (!confirm("Services already exist. Replace them?")) return;
        // Optional: Delete existing services
      }
      
      // Upload Services
      const servicePromises = fullServices.map(async (service) => {
        return addDoc(collection(db, "services"), {
          ...service,
          createdAt: new Date()
        });
      });
      
      // Upload Slots
      const slotPromises = fullSlots.map(async (slot) => {
        return addDoc(collection(db, "slots"), { 
          ...slot, 
          capacity: parseInt(slot.capacity) || 2,
          bookedCount: 0,
          createdAt: new Date()
        });
      });
      
      await Promise.all([...servicePromises, ...slotPromises]);
      alert("✅ Data uploaded successfully!");
    } catch (error) {
      console.error("Upload error:", error);
      alert("❌ Error uploading data. Please try again.");
    }
  };

  const handleDeleteService = async (id) => {
    if (!confirm("Delete this service permanently?")) return;
    try {
      await deleteDoc(doc(db, "services", id));
    } catch (error) {
      alert("Error deleting service");
    }
  };

  const handleDeleteSlot = async (id) => {
    if (!confirm("Delete this time slot? Existing bookings might be affected.")) return;
    try {
      await deleteDoc(doc(db, "slots", id));
    } catch (error) {
      alert("Error deleting slot");
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, "bookings", id), { 
        status: newStatus,
        updatedAt: new Date()
      });
    } catch (error) {
      alert("Error updating status");
    }
  };

  const handleAddService = async (e) => {
    e.preventDefault();
    if (!serviceName.trim() || !servicePrice || !serviceDuration) {
      alert("Please fill all required fields");
      return;
    }
    
    try {
      await addDoc(collection(db, "services"), { 
        name: serviceName.trim(),
        price: parseFloat(servicePrice),
        category: serviceCategory,
        type: serviceType,
        duration: serviceDuration,
        createdAt: new Date()
      });
      
      // Reset form
      setServiceName("");
      setServicePrice("");
      setServiceDuration("30");
      alert("✅ Service added successfully!");
    } catch (error) {
      alert("❌ Error adding service");
    }
  };

  const handleAddSlot = async (e) => {
    e.preventDefault();
    if (!slotTime) {
      alert("Please select a time");
      return;
    }
    
    try {
      await addDoc(collection(db, "slots"), { 
        time: slotTime,
        capacity: parseInt(slotCapacity) || 2,
        bookedCount: 0,
        createdAt: new Date()
      });
      
      setSlotTime("");
      setSlotCapacity("2");
      alert("✅ Time slot added successfully!");
    } catch (error) {
      alert("❌ Error adding time slot");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Login error:", error);
      setLoginError("Invalid email or password");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-white text-lg font-medium">Loading Admin Panel...</p>
          <p className="text-gray-400 text-sm mt-2">Touch & Glow Salon</p>
        </div>
      </div>
    );
  }

  // Login Screen
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 p-6 sm:p-8 text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <ShieldCheck className="text-yellow-600" size={28} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Admin Portal</h1>
            <p className="text-yellow-100 text-sm sm:text-base mt-2">Touch & Glow Salon</p>
          </div>
          
          <div className="p-6 sm:p-8">
            <form onSubmit={handleLogin}>
              {loginError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-sm flex items-center gap-2">
                  <AlertCircle size={16} />
                  {loginError}
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="email" 
                      placeholder="admin@salon.com"
                      className="w-full pl-12 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition text-sm sm:text-base"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">Password</label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="password" 
                      placeholder="••••••••"
                      className="w-full pl-12 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition text-sm sm:text-base"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                
                <button 
                  type="submit" 
                  disabled={loginLoading}
                  className="w-full bg-gradient-to-r from-gray-900 to-black text-white py-3 rounded-xl font-bold hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70 text-sm sm:text-base"
                >
                  {loginLoading ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Signing In...
                    </>
                  ) : (
                    <>
                      <LogOut size={20} />
                      Sign In to Dashboard
                    </>
                  )}
                </button>
              </div>
            </form>
            
            <div className="mt-6 pt-6 border-t text-center">
              <p className="text-gray-500 text-xs sm:text-sm">
                For authorized personnel only
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white text-gray-900">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b sticky top-0 z-50 p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div>
            <h1 className="font-bold text-base">Touch & Glow</h1>
            <p className="text-xs text-gray-500">Admin Panel</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleLogout}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div className="flex">
        {/* Sidebar */}
        <div className={`
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
          md:translate-x-0 fixed md:relative inset-y-0 left-0 z-40
          w-full md:w-64 bg-white border-r flex flex-col transition-transform duration-300
          md:h-screen h-full overflow-y-auto
        `}>
          <div className="p-4 md:p-6 border-b">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center">
                <Briefcase className="text-white" size={20} />
              </div>
              <div>
                <h1 className="font-bold text-lg md:text-xl">Touch & Glow</h1>
                <p className="text-xs text-gray-500">Admin Dashboard</p>
              </div>
            </div>
            
            <div className="space-y-1">
              <button 
                onClick={() => { setActiveTab("bookings"); setMobileMenuOpen(false); }}
                className={`w-full text-left p-3 rounded-xl flex items-center gap-3 font-medium transition-all text-sm md:text-base ${
                  activeTab === "bookings" 
                    ? "bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-lg" 
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <LayoutDashboard size={18} />
                Dashboard
              </button>
              
              <button 
                onClick={() => { setActiveTab("services"); setMobileMenuOpen(false); }}
                className={`w-full text-left p-3 rounded-xl flex items-center gap-3 font-medium transition-all text-sm md:text-base ${
                  activeTab === "services" 
                    ? "bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-lg" 
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Settings size={18} />
                Manage Shop
              </button>
            </div>
          </div>
          
          <div className="p-4 md:p-6 mt-auto">
            <div className="bg-gray-50 rounded-xl p-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-r from-gray-900 to-black rounded-full flex items-center justify-center">
                  <User className="text-white" size={14} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-xs md:text-sm">Admin</p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
              </div>
            </div>
            
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 text-red-600 font-medium p-3 rounded-xl hover:bg-red-50 transition text-sm"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 p-3 md:p-6">
          {/* TAB 1: BOOKINGS */}
          {activeTab === "bookings" && (
            <div className="animate-in fade-in duration-500">
              {/* Mobile Controls */}
              <div className="md:hidden mb-4">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
                    <p className="text-xs text-gray-500">{bookings.length} bookings</p>
                  </div>
                  <button 
                    onClick={() => setShowFilters(!showFilters)}
                    className="p-2 bg-gray-100 rounded-lg"
                  >
                    <Filter size={18} />
                  </button>
                </div>
                
                {/* Mobile Filters */}
                {showFilters && (
                  <div className="bg-white p-4 rounded-xl border shadow-sm mb-4 animate-in slide-in-from-top">
                    <div className="flex items-center gap-2 mb-3">
                      <Search size={16} className="text-gray-400" />
                      <input 
                        type="text"
                        placeholder="Search..."
                        className="flex-1 p-2 border rounded-lg text-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar size={16} className="text-gray-400" />
                      <input 
                        type="date" 
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="flex-1 p-2 border rounded-lg text-sm"
                      />
                    </div>
                    
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      <button 
                        onClick={() => setStatusFilter("all")}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                          statusFilter === "all" 
                            ? "bg-gray-900 text-white" 
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        All
                      </button>
                      <button 
                        onClick={() => setStatusFilter("pending")}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                          statusFilter === "pending" 
                            ? "bg-yellow-500 text-white" 
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        Pending
                      </button>
                      <button 
                        onClick={() => setStatusFilter("completed")}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                          statusFilter === "completed" 
                            ? "bg-green-500 text-white" 
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        Completed
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Desktop Header */}
              <div className="hidden md:block mb-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Appointments Dashboard</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage and track all salon bookings</p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        type="text"
                        placeholder="Search bookings..."
                        className="pl-12 pr-4 py-3 bg-white border rounded-xl w-full md:w-64 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none text-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    
                    <div className="bg-white p-2 rounded-xl border shadow-sm flex items-center gap-2">
                      <Calendar className="text-gray-500" size={18} />
                      <input 
                        type="date" 
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="outline-none text-sm font-medium bg-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Stats Cards - Mobile */}
              <div className="md:hidden grid grid-cols-2 gap-3 mb-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-2xl shadow">
                  <p className="text-blue-100 text-xs font-medium">REVENUE</p>
                  <h3 className="text-lg font-bold mt-1">₹{stats.revenue}</h3>
                </div>
                
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-4 rounded-2xl shadow">
                  <p className="text-purple-100 text-xs font-medium">BOOKINGS</p>
                  <h3 className="text-lg font-bold mt-1">{stats.total}</h3>
                </div>
                
                <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded-2xl shadow">
                  <p className="text-green-100 text-xs font-medium">COMPLETED</p>
                  <h3 className="text-lg font-bold mt-1">{stats.completed}</h3>
                </div>
                
                <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white p-4 rounded-2xl shadow">
                  <p className="text-yellow-100 text-xs font-medium">UPCOMING</p>
                  <h3 className="text-lg font-bold mt-1">{stats.upcoming}</h3>
                </div>
              </div>
              
              {/* Stats Cards - Desktop */}
              <div className="hidden md:grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-5 rounded-2xl shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium">TOTAL REVENUE</p>
                      <h3 className="text-2xl md:text-3xl font-bold mt-2">₹{stats.revenue}</h3>
                    </div>
                    <DollarSign size={24} className="opacity-80" />
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-5 rounded-2xl shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm font-medium">TOTAL BOOKINGS</p>
                      <h3 className="text-2xl md:text-3xl font-bold mt-2">{stats.total}</h3>
                    </div>
                    <Users size={24} className="opacity-80" />
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-5 rounded-2xl shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm font-medium">COMPLETED</p>
                      <h3 className="text-2xl md:text-3xl font-bold mt-2">{stats.completed}</h3>
                    </div>
                    <CheckCircle size={24} className="opacity-80" />
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white p-5 rounded-2xl shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-yellow-100 text-sm font-medium">UPCOMING</p>
                      <h3 className="text-2xl md:text-3xl font-bold mt-2">{stats.upcoming}</h3>
                    </div>
                    <Clock size={24} className="opacity-80" />
                  </div>
                </div>
              </div>
              
              {/* Status Filters - Desktop */}
              <div className="hidden md:flex gap-2 mb-6 overflow-x-auto pb-2">
                <button 
                  onClick={() => setStatusFilter("all")}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                    statusFilter === "all" 
                      ? "bg-gradient-to-r from-gray-900 to-black text-white" 
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  All Bookings
                </button>
                <button 
                  onClick={() => setStatusFilter("pending")}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                    statusFilter === "pending" 
                      ? "bg-gradient-to-r from-yellow-500 to-yellow-600 text-white" 
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Pending
                </button>
                <button 
                  onClick={() => setStatusFilter("completed")}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                    statusFilter === "completed" 
                      ? "bg-gradient-to-r from-green-500 to-green-600 text-white" 
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Completed
                </button>
                <button 
                  onClick={() => setStatusFilter("cancelled")}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                    statusFilter === "cancelled" 
                      ? "bg-gradient-to-r from-red-500 to-red-600 text-white" 
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Cancelled
                </button>
                <button 
                  onClick={() => setTimeSort(timeSort === "asc" ? "desc" : "asc")}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap flex items-center gap-1 ${
                    "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <ArrowUpDown size={14} />
                  {timeSort === "asc" ? "A-Z" : "Z-A"}
                </button>
              </div>

              {/* Selection Bar */}
              {selectedBookings.length > 0 && (
                <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white p-3 rounded-xl mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckSquare size={18} />
                    <span className="text-sm font-medium">{selectedBookings.length} selected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        selectedBookings.forEach(id => handleStatusUpdate(id, 'completed'));
                        setSelectedBookings([]);
                      }}
                      className="text-xs bg-white text-yellow-600 px-3 py-1 rounded-lg font-medium"
                    >
                      Mark Complete
                    </button>
                    <button 
                      onClick={() => setSelectedBookings([])}
                      className="text-xs bg-white text-red-600 px-3 py-1 rounded-lg font-medium"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}
              
              {/* Bookings List - Mobile */}
              <div className="md:hidden">
                {bookings.length === 0 ? (
                  <div className="bg-white p-8 rounded-2xl border text-center">
                    <Calendar className="mx-auto text-gray-300 mb-3" size={40} />
                    <h3 className="text-base font-medium text-gray-500 mb-2">No bookings found</h3>
                    <p className="text-gray-400 text-sm">Try selecting a different date</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bookings.map((booking) => (
                      <div key={booking.id} className="bg-white rounded-xl border shadow-sm p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => toggleSelectBooking(booking.id)}
                              className="p-1"
                            >
                              {selectedBookings.includes(booking.id) ? 
                                <CheckSquare className="text-yellow-600" size={18} /> : 
                                <Square className="text-gray-300" size={18} />
                              }
                            </button>
                            <div className="flex items-center gap-2">
                              <Clock className="text-yellow-600" size={16} />
                              <span className="font-bold">{booking.slotTime}</span>
                            </div>
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                            booking.status === 'completed' 
                              ? 'bg-green-100 text-green-700' 
                              : booking.status === 'cancelled'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {booking.status?.toUpperCase() || 'PENDING'}
                          </span>
                        </div>
                        
                        <div className="mb-3">
                          <p className="font-bold text-gray-900 text-sm">{booking.customerName}</p>
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                            <Phone size={12} />
                            {booking.customerPhone}
                          </div>
                        </div>
                        
                        <div className="mb-4">
                          <p className="text-sm text-gray-700">{booking.serviceName}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            ₹{booking.servicePrice} • {booking.serviceCount || 1} service{booking.serviceCount > 1 ? 's' : ''}
                          </p>
                        </div>
                        
                        <div className="flex gap-2">
                          {booking.status !== 'completed' && (
                            <button 
                              onClick={() => handleStatusUpdate(booking.id, 'completed')}
                              className="flex-1 bg-green-50 text-green-600 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1"
                            >
                              <CheckCircle size={14} />
                              Complete
                            </button>
                          )}
                          {booking.status !== 'cancelled' && (
                            <button 
                              onClick={() => handleStatusUpdate(booking.id, 'cancelled')}
                              className="flex-1 bg-red-50 text-red-600 py-2 rounded-lg text-xs font-medium"
                            >
                              Cancel
                            </button>
                          )}
                          <button 
                            onClick={async() => {
                              if (confirm("Delete this booking?")) {
                                await deleteDoc(doc(db, "bookings", booking.id));
                              }
                            }}
                            className="p-2 bg-gray-100 text-gray-600 rounded-lg"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Bookings Table - Desktop */}
              <div className="hidden md:block bg-white rounded-2xl border shadow-lg overflow-hidden">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={toggleSelectAll}
                      className="p-1"
                    >
                      {selectAll ? 
                        <CheckSquare className="text-yellow-600" size={18} /> : 
                        <Square className="text-gray-400" size={18} />
                      }
                    </button>
                    <div>
                      <h3 className="font-bold text-gray-800">Appointments for {selectedDate}</h3>
                      <p className="text-sm text-gray-500">{bookings.length} bookings found</p>
                    </div>
                  </div>
                  <BarChart3 className="text-gray-400" size={20} />
                </div>
                
                {bookings.length === 0 ? (
                  <div className="p-12 text-center">
                    <Calendar className="mx-auto text-gray-300 mb-4" size={48} />
                    <h3 className="text-lg font-medium text-gray-500 mb-2">No bookings found</h3>
                    <p className="text-gray-400">Try selecting a different date or clearing filters</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr className="text-left text-xs text-gray-500 uppercase font-bold">
                          <th className="p-4 w-12"></th>
                          <th className="p-4">Time</th>
                          <th className="p-4">Client Details</th>
                          <th className="p-4">Service</th>
                          <th className="p-4">Status</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {bookings.map((booking) => (
                          <tr key={booking.id} className="hover:bg-gray-50 transition">
                            <td className="p-4">
                              <button 
                                onClick={() => toggleSelectBooking(booking.id)}
                                className="p-1"
                              >
                                {selectedBookings.includes(booking.id) ? 
                                  <CheckSquare className="text-yellow-600" size={16} /> : 
                                  <Square className="text-gray-300" size={16} />
                                }
                              </button>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <Clock className="text-yellow-600" size={16} />
                                <span className="font-mono font-bold">{booking.slotTime}</span>
                              </div>
                            </td>
                            <td className="p-4">
                              <div>
                                <p className="font-bold text-gray-900">{booking.customerName}</p>
                                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                  <Phone size={14} />
                                  {booking.customerPhone}
                                </div>
                                {booking.notes && (
                                  <p className="text-xs text-gray-400 mt-1 italic">Note: {booking.notes}</p>
                                )}
                              </div>
                            </td>
                            <td className="p-4">
                              <div>
                                <p className="font-medium text-gray-900">{booking.serviceName}</p>
                                <p className="text-sm text-gray-600 mt-1">
                                  ₹{booking.servicePrice} • {booking.serviceCount || 1} service{booking.serviceCount > 1 ? 's' : ''}
                                </p>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                                booking.status === 'completed' 
                                  ? 'bg-green-100 text-green-700' 
                                  : booking.status === 'cancelled'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {booking.status === 'completed' && <CheckCircle size={12} />}
                                {booking.status?.toUpperCase() || 'PENDING'}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex justify-end gap-2">
                                {booking.status !== 'completed' && (
                                  <button 
                                    onClick={() => handleStatusUpdate(booking.id, 'completed')}
                                    className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition flex items-center gap-1 text-sm"
                                    title="Mark as completed"
                                  >
                                    <CheckCircle size={16} />
                                    Complete
                                  </button>
                                )}
                                
                                {booking.status !== 'cancelled' && (
                                  <button 
                                    onClick={() => handleStatusUpdate(booking.id, 'cancelled')}
                                    className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition text-sm"
                                    title="Cancel booking"
                                  >
                                    Cancel
                                  </button>
                                )}
                                
                                <button 
                                  onClick={async() => {
                                    if (confirm("Delete this booking permanently?")) {
                                      await deleteDoc(doc(db, "bookings", booking.id));
                                    }
                                  }}
                                  className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition"
                                  title="Delete booking"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: MANAGE SHOP */}
          {activeTab === "services" && (
            <div className="animate-in fade-in duration-500">
              {/* Mobile Header */}
              <div className="md:hidden mb-4">
                <h1 className="text-xl font-bold text-gray-900">Shop Management</h1>
                <p className="text-xs text-gray-500">Manage services and time slots</p>
              </div>

              {/* Desktop Header */}
              <div className="hidden md:block mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Shop Management</h1>
                <p className="text-gray-500">Manage services, time slots, and shop settings</p>
              </div>
              
              {/* Bulk Upload Card */}
              <div className="bg-gradient-to-r from-gray-900 to-black text-white p-4 md:p-6 rounded-2xl shadow-xl mb-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <UploadCloud size={20} className="text-yellow-400" />
                      <h3 className="font-bold text-lg">Initialize Shop Data</h3>
                    </div>
                    <p className="text-gray-300 text-sm">
                      One-click setup to upload all salon services and time slots.
                    </p>
                  </div>
                  <button 
                    onClick={handleBulkUpload}
                    className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-gray-900 px-4 py-3 rounded-xl font-bold hover:shadow-2xl transition-all duration-300 whitespace-nowrap flex items-center gap-2 text-sm"
                  >
                    <UploadCloud size={18} />
                    Upload Full Data
                  </button>
                </div>
              </div>
              
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Services Management */}
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl border shadow-lg overflow-hidden">
                    <div className="p-4 border-b">
                      <h3 className="font-bold text-base flex items-center gap-2">
                        <Plus size={18} className="text-yellow-600" />
                        Add New Service
                      </h3>
                    </div>
                    
                    <form onSubmit={handleAddService} className="p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                          <select 
                            className="w-full p-2 border rounded-lg focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 outline-none text-sm"
                            value={serviceType}
                            onChange={(e) => setServiceType(e.target.value)}
                          >
                            <option value="Male">👨 Male</option>
                            <option value="Female">👩 Female</option>
                            <option value="Kids">👶 Kids</option>
                            <option value="Unisex">👥 Unisex</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                          <select 
                            className="w-full p-2 border rounded-lg focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 outline-none text-sm"
                            value={serviceCategory}
                            onChange={(e) => setServiceCategory(e.target.value)}
                          >
                            <option value="Hair Cut">Hair Cut</option>
                            <option value="Facial">Facial</option>
                            <option value="Massage">Massage</option>
                            <option value="Waxing">Waxing</option>
                          </select>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Service Name *</label>
                        <input 
                          type="text"
                          placeholder="e.g., Classic Haircut"
                          className="w-full p-2 border rounded-lg focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 outline-none text-sm"
                          value={serviceName}
                          onChange={(e) => setServiceName(e.target.value)}
                          required
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Price (₹) *</label>
                          <input 
                            type="number"
                            placeholder="e.g., 300"
                            className="w-full p-2 border rounded-lg focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 outline-none text-sm"
                            value={servicePrice}
                            onChange={(e) => setServicePrice(e.target.value)}
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Duration (mins)</label>
                          <input 
                            type="number"
                            placeholder="e.g., 30"
                            className="w-full p-2 border rounded-lg focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 outline-none text-sm"
                            value={serviceDuration}
                            onChange={(e) => setServiceDuration(e.target.value)}
                          />
                        </div>
                      </div>
                      
                      <button 
                        type="submit"
                        className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-white py-2 rounded-lg font-bold hover:shadow transition text-sm"
                      >
                        Add Service
                      </button>
                    </form>
                  </div>
                  
                  {/* Services List */}
                  <div className="bg-white rounded-2xl border shadow-lg overflow-hidden">
                    <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                      <h3 className="font-bold text-gray-800 text-sm">All Services ({servicesList.length})</h3>
                      <Tag className="text-gray-400" size={16} />
                    </div>
                    
                    <div className="max-h-[400px] overflow-y-auto divide-y">
                      {servicesList.length === 0 ? (
                        <div className="p-6 text-center">
                          <p className="text-gray-400 text-sm">No services added yet</p>
                        </div>
                      ) : (
                        servicesList.map((service) => (
                          <div key={service.id} className="p-3 hover:bg-gray-50 transition">
                            <div className="flex justify-between items-start">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1 mb-1">
                                  <h4 className="font-bold text-sm truncate">{service.name}</h4>
                                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 shrink-0">
                                    {service.type}
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-1 text-xs text-gray-500">
                                  <span>{service.category}</span>
                                  <span>•</span>
                                  <span className="font-bold text-gray-900">₹{service.price}</span>
                                  {service.duration && (
                                    <>
                                      <span>•</span>
                                      <span>{service.duration} mins</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <button 
                                onClick={() => handleDeleteService(service.id)}
                                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition ml-2"
                                title="Delete service"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Slots Management */}
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl border shadow-lg overflow-hidden">
                    <div className="p-4 border-b">
                      <h3 className="font-bold text-base flex items-center gap-2">
                        <Plus size={18} className="text-yellow-600" />
                        Add Time Slot
                      </h3>
                    </div>
                    
                    <form onSubmit={handleAddSlot} className="p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Time *</label>
                          <input 
                            type="time"
                            className="w-full p-2 border rounded-lg focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 outline-none text-sm"
                            value={slotTime}
                            onChange={(e) => setSlotTime(e.target.value)}
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Capacity</label>
                          <input 
                            type="number"
                            placeholder="Max bookings"
                            className="w-full p-2 border rounded-lg focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 outline-none text-sm"
                            value={slotCapacity}
                            onChange={(e) => setSlotCapacity(e.target.value)}
                            min="1"
                          />
                        </div>
                      </div>
                      
                      <button 
                        type="submit"
                        className="w-full bg-gradient-to-r from-gray-900 to-black text-white py-2 rounded-lg font-bold hover:shadow transition text-sm"
                      >
                        Add Time Slot
                      </button>
                    </form>
                  </div>
                  
                  {/* Slots List */}
                  <div className="bg-white rounded-2xl border shadow-lg overflow-hidden">
                    <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                      <h3 className="font-bold text-gray-800 text-sm">Time Slots ({slotsList.length})</h3>
                      <Clock className="text-gray-400" size={16} />
                    </div>
                    
                    <div className="max-h-[400px] overflow-y-auto divide-y">
                      {slotsList.length === 0 ? (
                        <div className="p-6 text-center">
                          <p className="text-gray-400 text-sm">No time slots added yet</p>
                        </div>
                      ) : (
                        slotsList.map((slot) => (
                          <div key={slot.id} className="p-3 hover:bg-gray-50 transition">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                  <Clock className="text-gray-600" size={16} />
                                </div>
                                <div>
                                  <p className="font-bold text-base font-mono">{slot.time}</p>
                                  <p className="text-xs text-gray-500">
                                    Capacity: {slot.bookedCount || 0}/{slot.capacity || 2}
                                  </p>
                                </div>
                              </div>
                              <button 
                                onClick={() => handleDeleteSlot(slot.id)}
                                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                title="Delete slot"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}