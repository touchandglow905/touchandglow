"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, query, where, onSnapshot } from "firebase/firestore";
import jsPDF from "jspdf";
import { Calendar, Clock, Sparkles, User, Check, ChevronRight, Search, MapPin, ShoppingBag, X } from "lucide-react";

export default function BookingPage() {
  const [services, setServices] = useState([]);
  const [baseSlots, setBaseSlots] = useState([]);
  const [calculatedSlots, setCalculatedSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeTab, setActiveTab] = useState("Male"); // 'Male', 'Female', 'Kids'
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // --- NEW: CART STATE (Multi-Selection) ---
  const [cart, setCart] = useState([]); // Stores multiple services
  
  // Selection
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [isBooking, setIsBooking] = useState(false);

  // Calculate Total Price
  const totalPrice = cart.reduce((sum, item) => sum + Number(item.price), 0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const servicesSnap = await getDocs(collection(db, "services"));
        const servicesData = servicesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setServices(servicesData);

        const slotsSnap = await getDocs(collection(db, "slots"));
        setBaseSlots(slotsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a,b)=>a.time.localeCompare(b.time)));
      } catch (error) { console.error(error); } 
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (baseSlots.length === 0) return;
    const q = query(collection(db, "bookings"), where("date", "==", selectedDate));
    const unsub = onSnapshot(q, (snap) => {
      const booked = snap.docs.map(d => d.data());
      setCalculatedSlots(baseSlots.map(slot => ({
        ...slot, 
        // Logic: A slot is full if bookings >= capacity
        isFull: booked.filter(b => b.slotTime === slot.time).length >= slot.capacity
      })));
    });
    return () => unsub();
  }, [selectedDate, baseSlots]);

  // --- TOGGLE SELECTION FUNCTION ---
  const toggleService = (service) => {
    const exists = cart.find(s => s.id === service.id);
    if (exists) {
      // Remove if already selected
      setCart(cart.filter(s => s.id !== service.id));
    } else {
      // Add to cart
      setCart([...cart, service]);
    }
  };

  // --- SMART FILTER LOGIC ---
  const filteredServices = services.filter(service => {
    // 1. Search Filter
    const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (service.category && service.category.toLowerCase().includes(searchQuery.toLowerCase()));

    // 2. Tab Filter (Men/Women/Kids)
    let type = service.type || "";
    if(!type) {
        const lowerName = (service.name + service.category).toLowerCase();
        if(lowerName.includes("female") || lowerName.includes("wax") || lowerName.includes("women") || lowerName.includes("makeup") || lowerName.includes("sider") || lowerName.includes("bridal")) type = "Female";
        else if(lowerName.includes("kid") || lowerName.includes("child")) type = "Kids";
        else type = "Male"; 
    }
    const matchesTab = type === activeTab;
    
    // 3. Category Filter
    const matchesCategory = selectedCategory === "All" || service.category === selectedCategory;

    return matchesSearch && matchesTab && matchesCategory;
  });

  const currentCategories = ["All", ...new Set(filteredServices.map(s => s.category || "General"))];

  // --- PREMIUM RECEIPT GENERATOR (UPDATED FOR MULTI ITEMS) ---
  const generateReceipt = () => {
    const doc = new jsPDF();
    const img = new Image();
    img.src = "/logo.png"; 

    img.onload = () => {
        // Header
        doc.setFillColor(15, 15, 15); doc.rect(0, 0, 210, 60, "F");
        doc.addImage(img, 'PNG', 10, 10, 30, 30); 
        doc.setTextColor(212, 175, 55); doc.setFont("helvetica", "bold"); doc.setFontSize(24);
        doc.text("TOUCH & GLOW", 50, 22);
        doc.setFontSize(10); doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "normal");
        doc.text("PREMIUM FAMILY SALON", 50, 30);
        doc.text("Ahmedabad, Gujarat | +91 99135 46386", 50, 38);

        // Body
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.text("BOOKING RECEIPT", 15, 75);
        doc.line(15, 77, 200, 77);

        let y = 90;
        doc.setFontSize(11); doc.setFont("helvetica", "normal");
        doc.text(`Customer Name: ${customerName}`, 15, y);
        doc.text(`Phone: ${customerPhone}`, 120, y);
        y += 10;
        doc.text(`Date: ${selectedDate}`, 15, y);
        doc.text(`Time Slot: ${selectedSlot.time}`, 120, y);
        
        y += 20;
        doc.setFont("helvetica", "bold");
        doc.text("Services Selected:", 15, y);
        y += 10;

        // Loop through Cart Items
        cart.forEach((item, index) => {
            doc.setFont("helvetica", "normal");
            doc.text(`${index + 1}. ${item.name} (${item.category})`, 15, y);
            doc.text(`Rs. ${item.price}`, 180, y, null, null, "right");
            y += 8;
        });

        // Total Box
        y += 10;
        doc.setDrawColor(212, 175, 55); doc.setLineWidth(1);
        doc.roundedRect(120, y, 75, 25, 3, 3, "S");
        doc.setFontSize(12); doc.text("TOTAL AMOUNT", 157, y + 8, null, null, "center");
        doc.setFontSize(18); doc.setTextColor(212, 175, 55);
        doc.text(`Rs. ${totalPrice}/-`, 157, y + 18, null, null, "center");

        // Footer
        doc.setFontSize(10); doc.setTextColor(150, 150, 150);
        doc.text("Thank you for choosing Touch & Glow!", 105, 280, null, null, "center");

        doc.save(`T&G_Receipt_${customerName}.pdf`);
        alert("Booking Confirmed! Receipt Downloaded.");
        window.location.reload();
    };
    img.onerror = () => { window.location.reload(); };
  };

  const handleBook = async () => {
    if (cart.length === 0 || !selectedSlot || !customerName || !customerPhone) return alert("Please fill details and select at least one service.");
    setIsBooking(true);
    
    // Combine service names for DB (e.g., "Haircut, Facial")
    const combinedServiceNames = cart.map(s => s.name).join(", ");
    
    try {
      await addDoc(collection(db, "bookings"), {
        customerName, 
        customerPhone, 
        serviceName: combinedServiceNames, // Saving all names
        servicePrice: totalPrice,          // Saving total price
        serviceCount: cart.length,
        slotTime: selectedSlot.time, 
        date: selectedDate, 
        status: 'pending',
        createdAt: new Date()
      });
      generateReceipt();
    } catch(e) { 
        console.error(e);
        alert("Error booking appointment");
        setIsBooking(false);
    } 
  };

  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-40 text-gray-900 font-sans">
      
      {/* Header */}
      <div className="bg-black pt-6 pb-6 px-5 rounded-b-[2rem] shadow-xl sticky top-0 z-20">
        <div className="flex justify-between items-center mb-4 text-white">
            <h1 className="text-xl font-bold tracking-tight">Touch & Glow</h1>
            <div className="flex gap-2">
                <a href="tel:9913546386" className="bg-white/20 p-2 rounded-full"><MapPin size={18}/></a>
            </div>
        </div>

        {/* TABS (Male / Female / Kids) */}
        <div className="flex bg-white/10 p-1 rounded-xl backdrop-blur-md mb-4">
            {["Male", "Female", "Kids"].map((tab) => (
                <button 
                    key={tab}
                    onClick={() => { setActiveTab(tab); setSelectedCategory("All"); }}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                        activeTab === tab 
                        ? "bg-white text-black shadow-md" 
                        : "text-white/70 hover:text-white"
                    }`}
                >
                    {tab === "Male" ? "MEN" : tab === "Female" ? "WOMEN" : "KIDS"}
                </button>
            ))}
        </div>

        {/* Search */}
        <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={18}/>
            <input 
                type="text" 
                placeholder={`Search ${activeTab} services...`}
                className="w-full bg-white text-black py-2.5 pl-10 pr-4 rounded-xl outline-none font-medium shadow-lg text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>
      </div>

      <div className="px-5 mt-4 relative z-10">
        
        {/* Date Picker */}
        <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3 mb-4">
            <Calendar size={18} className="text-blue-600"/>
            <input 
                type="date" 
                value={selectedDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => { setSelectedDate(e.target.value); setSelectedSlot(null); }}
                className="w-full outline-none font-bold text-gray-800 bg-transparent text-sm"
            />
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar mb-2">
            {currentCategories.map(cat => (
                <button 
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap border transition-all ${
                    selectedCategory === cat 
                    ? "bg-black text-white border-black" 
                    : "bg-white text-gray-500 border-gray-200"
                  }`}
                >
                    {cat}
                </button>
            ))}
        </div>

        {/* SERVICES LIST (Multi Select) */}
        <div className="space-y-3 min-h-[200px]">
            {filteredServices.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">No services found.</div>
            ) : (
                filteredServices.map((service) => {
                    const isSelected = cart.some(s => s.id === service.id);
                    return (
                        <div 
                            key={service.id}
                            onClick={() => toggleService(service)}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer flex justify-between items-center ${
                                isSelected 
                                ? "bg-gray-900 text-white border-gray-900 shadow-md transform scale-[1.01]" 
                                : "bg-white border-gray-100 text-gray-800"
                            }`}
                        >
                            <div>
                                <h3 className="font-bold text-sm">{service.name}</h3>
                                <p className={`text-[10px] uppercase font-bold tracking-wide mt-1 ${isSelected?"text-gray-400":"text-gray-400"}`}>
                                    {service.category}
                                </p>
                            </div>
                            <div className="text-right">
                                <span className="font-bold text-lg block">₹{service.price}</span>
                                {isSelected && <span className="text-[10px] bg-green-500 text-white px-2 py-0.5 rounded-full">ADDED</span>}
                            </div>
                        </div>
                    );
                })
            )}
        </div>

        {/* Slots Grid */}
        {cart.length > 0 && (
            <div className="mt-8 animate-in slide-in-from-bottom-4">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Clock size={18} className="text-blue-600"/> Select Time
                </h3>
                <div className="grid grid-cols-4 gap-2">
                    {calculatedSlots.map((slot) => (
                        <button
                            key={slot.id}
                            disabled={slot.isFull}
                            onClick={() => setSelectedSlot(slot)}
                            className={`py-3 rounded-lg text-xs font-bold border transition-all ${
                                slot.isFull 
                                ? "bg-gray-100 text-gray-300 border-transparent line-through" 
                                : selectedSlot?.id === slot.id
                                    ? "bg-blue-600 text-white border-blue-600 shadow-lg scale-105"
                                    : "bg-white text-gray-700 border-gray-200"
                            }`}
                        >
                            {slot.time}
                        </button>
                    ))}
                </div>
            </div>
        )}
      </div>

      {/* STICKY CART FOOTER */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 w-full bg-white border-t shadow-[0_-5px_20px_rgba(0,0,0,0.1)] z-50 rounded-t-2xl animate-in slide-in-from-bottom-full">
            {/* Selected Items Preview */}
            <div className="px-5 py-3 border-b bg-gray-50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <ShoppingBag size={16} className="text-blue-600"/>
                    <span className="font-bold text-sm">{cart.length} Services Selected</span>
                </div>
                <span className="font-bold text-lg text-blue-600">₹{totalPrice}</span>
            </div>

            {selectedSlot ? (
                <div className="p-5 space-y-3">
                    {!isBooking ? (
                        <>
                            <div className="flex gap-2">
                                <input placeholder="Name" className="flex-1 bg-gray-100 p-3 rounded-xl outline-none font-medium text-sm" onChange={e=>setCustomerName(e.target.value)}/>
                                <input placeholder="Phone" type="tel" className="w-1/3 bg-gray-100 p-3 rounded-xl outline-none font-medium text-sm" onChange={e=>setCustomerPhone(e.target.value)}/>
                            </div>
                            <button onClick={handleBook} className="w-full bg-black text-white py-3.5 rounded-xl font-bold text-lg flex justify-center items-center gap-2 hover:bg-gray-900">
                                Confirm Booking <ChevronRight size={20}/>
                            </button>
                        </>
                    ) : (
                         <div className="text-center font-bold text-gray-500 py-4">Processing Booking...</div>
                    )}
                </div>
            ) : (
                <div className="p-4 text-center text-sm text-red-500 font-medium">
                    Please select a time slot above to continue.
                </div>
            )}
        </div>
      )}
    </div>
  );
}