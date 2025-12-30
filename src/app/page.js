"use client";

import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, query, where, onSnapshot } from "firebase/firestore";
import { Calendar, Clock, Sparkles, User, Check, ChevronRight, Search, MapPin, ShoppingBag, X, Phone, Mail, Instagram, Home, ArrowLeft, Loader2, Download } from "lucide-react";
import html2canvas from "html2canvas";

export default function BookingPage() {
  // Steps for better UX
  const [step, setStep] = useState(1); // 1: Services, 2: Time, 3: Details, 4: Confirmation
  
  // Data states
  const [services, setServices] = useState([]);
  const [baseSlots, setBaseSlots] = useState([]);
  const [calculatedSlots, setCalculatedSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [activeTab, setActiveTab] = useState("Male");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  
  // Cart State
  const [cart, setCart] = useState([]);
  
  // Selection
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Receipt Ref
  const receiptRef = useRef(null);
  
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
      } catch (error) { 
        console.error("Error fetching data:", error); 
      } 
      finally { 
        setLoading(false); 
      }
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
        isFull: booked.filter(b => b.slotTime === slot.time).length >= slot.capacity
      })));
    });
    return () => unsub();
  }, [selectedDate, baseSlots]);

  const toggleService = (service) => {
    const exists = cart.find(s => s.id === service.id);
    if (exists) {
      setCart(cart.filter(s => s.id !== service.id));
    } else {
      setCart([...cart, service]);
    }
  };

  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (service.category && service.category.toLowerCase().includes(searchQuery.toLowerCase()));

    let type = service.type || "";
    if(!type) {
        const lowerName = (service.name + service.category).toLowerCase();
        if(lowerName.includes("female") || lowerName.includes("wax") || lowerName.includes("women") || lowerName.includes("makeup") || lowerName.includes("sider") || lowerName.includes("bridal")) type = "Female";
        else if(lowerName.includes("kid") || lowerName.includes("child")) type = "Kids";
        else type = "Male"; 
    }
    const matchesTab = type === activeTab;
    
    const matchesCategory = selectedCategory === "All" || service.category === selectedCategory;

    return matchesSearch && matchesTab && matchesCategory;
  });

  const currentCategories = ["All", ...new Set(filteredServices.map(s => s.category || "General"))];

  // Handle step navigation
  const goToNextStep = () => {
    if (step === 1 && cart.length === 0) {
      alert("Please select at least one service");
      return;
    }
    if (step === 2 && !selectedSlot) {
      alert("Please select a time slot");
      return;
    }
    if (step === 3 && (!customerName || !customerPhone || customerPhone.length < 10)) {
      alert("Please fill all details correctly (10-digit phone)");
      return;
    }
    setStep(step + 1);
  };

  const goToPrevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  // Reset booking
  const resetBooking = () => {
    setStep(1);
    setCart([]);
    setSelectedSlot(null);
    setCustomerName("");
    setCustomerPhone("");
    setShowSuccess(false);
  };

  // Generate and Download Image Receipt
  const downloadImageReceipt = () => {
    if (!receiptRef.current) {
      console.error("Receipt element not found");
      alert("Error generating receipt. Please try again.");
      return;
    }

    setIsBooking(true);

    // Add a small delay to ensure the receipt is fully rendered
    setTimeout(() => {
      // First remove any gradient classes to avoid html2canvas error
      const receiptElement = receiptRef.current;
      
      // Create a copy of the receipt element without gradients
      const tempReceipt = document.createElement('div');
      tempReceipt.innerHTML = receiptElement.innerHTML;
      
      // Remove gradient classes and replace with solid colors
      const gradientElements = tempReceipt.querySelectorAll('[class*="gradient"]');
      gradientElements.forEach(el => {
        const classes = el.className.split(' ');
        const newClasses = classes.filter(c => !c.includes('gradient'));
        el.className = newClasses.join(' ');
        
        // Replace gradient backgrounds with solid colors
        if (el.className.includes('from-yellow-500') && el.className.includes('to-yellow-600')) {
          el.style.background = '#f59e0b'; // yellow-500
        }
        if (el.className.includes('from-green-500') && el.className.includes('to-green-400')) {
          el.style.background = '#10b981'; // green-500
        }
      });

      // Create a temporary container for html2canvas
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      tempContainer.style.width = '600px';
      tempContainer.style.backgroundColor = '#ffffff';
      tempContainer.style.padding = '32px';
      tempContainer.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
      tempContainer.style.borderRadius = '12px';
      tempContainer.style.border = '1px solid #e5e7eb';
      
      // Apply receipt content to temporary container
      tempContainer.innerHTML = `
        <div class="w-full bg-white p-8">
          ${tempReceipt.innerHTML}
        </div>
      `;
      
      document.body.appendChild(tempContainer);

      // Use html2canvas with safe options
      html2canvas(tempContainer, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        allowTaint: true,
        removeContainer: true,
        width: 600,
        height: tempContainer.scrollHeight,
        windowWidth: 600,
        windowHeight: tempContainer.scrollHeight,
        onclone: (clonedDoc) => {
          // Ensure no gradients in cloned document
          const clonedGradients = clonedDoc.querySelectorAll('[class*="gradient"]');
          clonedGradients.forEach(el => {
            const classes = el.className.split(' ');
            const newClasses = classes.filter(c => !c.includes('gradient'));
            el.className = newClasses.join(' ');
          });
        }
      }).then((canvas) => {
        // Convert canvas to image
        const imageData = canvas.toDataURL("image/png", 1.0);
        
        // Create download link
        const link = document.createElement("a");
        link.download = `TouchAndGlow_Booking_${customerName.replace(/\s+/g, '_')}_${selectedDate}.png`;
        link.href = imageData;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up
        document.body.removeChild(tempContainer);
        
        setIsBooking(false);
        
        // Show success and reset after delay
        setStep(4);
        setShowSuccess(true);
        
        // Auto reset after 8 seconds
        setTimeout(() => {
          resetBooking();
        }, 8000);
      }).catch((error) => {
        console.error("Error generating receipt:", error);
        // Fallback to simple canvas
        generateSimpleReceipt();
        document.body.removeChild(tempContainer);
      });
    }, 500);
  };

  // Simple fallback receipt generator
  const generateSimpleReceipt = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      alert("Error creating receipt. Please try again.");
      setIsBooking(false);
      return;
    }

    // Fill background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw header
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(0, 0, canvas.width, 100);
    
    // Salon name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('TOUCH & GLOW', canvas.width/2, 40);
    
    ctx.font = 'bold 16px Arial';
    ctx.fillText('PREMIUM FAMILY SALON', canvas.width/2, 65);
    
    ctx.font = '14px Arial';
    ctx.fillText('Ahmedabad, Gujarat | +91 99 135 46386', canvas.width/2, 85);

    // Booking details
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 22px Arial';
    ctx.fillText('BOOKING DETAILS', canvas.width/2, 140);
    
    // Date
    ctx.font = 'bold 16px Arial';
    ctx.fillText('DATE', canvas.width/2, 170);
    
    ctx.font = '14px Arial';
    ctx.fillText(selectedDate, canvas.width/2, 190);

    // Client info
    let yPos = 230;
    ctx.textAlign = 'left';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('Client Name:', 50, yPos);
    ctx.font = '14px Arial';
    ctx.fillText(customerName, 200, yPos);
    
    yPos += 30;
    ctx.font = 'bold 14px Arial';
    ctx.fillText('Phone:', 50, yPos);
    ctx.font = '14px Arial';
    ctx.fillText(customerPhone, 200, yPos);
    
    if (cart.length > 0) {
      yPos += 30;
      ctx.font = 'bold 14px Arial';
      ctx.fillText('Service:', 50, yPos);
      ctx.font = '14px Arial';
      ctx.fillText(cart[0].name, 200, yPos);
      
      yPos += 30;
      ctx.font = 'bold 14px Arial';
      ctx.fillText('Category:', 50, yPos);
      ctx.font = '14px Arial';
      ctx.fillText(cart[0].category || 'General', 200, yPos);
    }
    
    yPos += 30;
    ctx.font = 'bold 14px Arial';
    ctx.fillText('Time Slot:', 50, yPos);
    ctx.font = '14px Arial';
    ctx.fillText(selectedSlot?.time || 'N/A', 200, yPos);

    // Total
    yPos += 60;
    ctx.textAlign = 'center';
    ctx.font = 'bold 18px Arial';
    ctx.fillText('TOTAL AMOUNT TO PAY', canvas.width/2, yPos);
    
    yPos += 40;
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 32px Arial';
    ctx.fillText(`Rs. ${totalPrice}/-`, canvas.width/2, yPos);

    // Notes
    yPos += 80;
    ctx.fillStyle = '#666666';
    ctx.font = 'italic 14px Arial';
    ctx.fillText('Note: Please arrive 10 mins before your time slot.', canvas.width/2, yPos);
    
    yPos += 25;
    ctx.fillText('Thank you for choosing Touch & Glow!', canvas.width/2, yPos);

    // Footer
    yPos += 50;
    ctx.fillStyle = '#999999';
    ctx.font = '12px Arial';
    ctx.fillText(`Booking ID: ${Date.now().toString().slice(-8)}`, canvas.width/2, yPos);
    
    yPos += 20;
    ctx.fillText(`Generated on: ${new Date().toLocaleString('en-IN')}`, canvas.width/2, yPos);

    // Download
    const link = document.createElement('a');
    link.download = `TouchAndGlow_Booking_${customerName.replace(/\s+/g, '_')}_${selectedDate}.png`;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setIsBooking(false);
    setStep(4);
    setShowSuccess(true);
    
    setTimeout(() => {
      resetBooking();
    }, 8000);
  };

  const handleBooking = async () => {
    if (!customerName || !customerPhone || customerPhone.length < 10) {
      alert("Please enter valid details");
      return;
    }
    
    setIsBooking(true);
    
    try {
      const combinedServiceNames = cart.map(s => s.name).join(", ");
      
      await addDoc(collection(db, "bookings"), {
        customerName, 
        customerPhone, 
        serviceName: combinedServiceNames,
        servicePrice: totalPrice,
        serviceCount: cart.length,
        slotTime: selectedSlot.time, 
        date: selectedDate, 
        status: 'confirmed',
        createdAt: new Date()
      });
      
      // Download image receipt
      downloadImageReceipt();
      
    } catch (error) {
      console.error("Booking error:", error);
      alert("Error booking appointment. Please try again.");
      setIsBooking(false);
    }
  };

  // Format date for receipt
  const formatDateForReceipt = (dateString) => {
    const date = new Date(dateString);
    const options = { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-IN', options);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-yellow-50 to-orange-50">
        <div className="animate-pulse text-center">
          <div className="w-24 h-24 mx-auto mb-6 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-ping opacity-20"></div>
            <div className="absolute inset-4 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center">
              <Sparkles className="text-white" size={36} />
            </div>
          </div>
          <p className="text-gray-800 font-bold text-xl mb-2">Touch & Glow</p>
          <p className="text-yellow-600 font-semibold mb-6">Family Salon</p>
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce delay-75"></div>
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce delay-150"></div>
          </div>
          <p className="text-gray-600 font-medium mt-4">Loading Services...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white text-gray-900 font-sans pb-24">
      
      {/* Hidden Receipt for Image Capture */}
      <div className="fixed -left-[9999px] -top-[9999px] opacity-0 pointer-events-none">
        <div 
          ref={receiptRef}
          className="w-[600px] bg-white p-8"
          style={{
            backgroundColor: '#ffffff',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            borderRadius: '12px',
            border: '1px solid #e5e7eb'
          }}
        >
          {/* Logo and Header */}
          <div className="flex flex-col items-center mb-6">
            <div className="mb-4">
              <div className="w-32 h-32" style={{ backgroundColor: '#f59e0b', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <span className="text-white text-2xl font-bold">T&G</span>
              </div>
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-1">TOUCH & GLOW</h1>
            <p className="text-sm font-semibold text-gray-600 mb-2">PREMIUM FAMILY SALON</p>
            <p className="text-xs text-gray-500">Ahmedabad, Gujarat | +91 99 135 46386</p>
          </div>

          {/* Divider */}
          <div style={{ height: '2px', background: '#f59e0b', width: '100%', marginBottom: '24px' }}></div>

          {/* Booking Details Title */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">BOOKING DETAILS</h2>
          </div>

          {/* Date Section */}
          <div className="text-center mb-8">
            <p className="text-sm font-semibold text-gray-600 mb-1">DATE</p>
            <p className="text-base text-gray-800">{formatDateForReceipt(selectedDate)}</p>
          </div>

          {/* Booking Information */}
          <div className="space-y-4 mb-8">
            <div className="flex justify-between">
              <span className="text-sm font-semibold text-gray-600">Client Name:</span>
              <span className="text-base text-gray-800 font-medium">{customerName}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm font-semibold text-gray-600">Phone:</span>
              <span className="text-base text-gray-800 font-medium">{customerPhone}</span>
            </div>
            
            {cart.length > 0 && (
              <>
                <div className="flex justify-between">
                  <span className="text-sm font-semibold text-gray-600">Service:</span>
                  <span className="text-base text-gray-800 font-medium">{cart[0].name}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm font-semibold text-gray-600">Category:</span>
                  <span className="text-base text-gray-800 font-medium">{cart[0].category || "General"}</span>
                </div>
              </>
            )}
            
            <div className="flex justify-between">
              <span className="text-sm font-semibold text-gray-600">Time Slot:</span>
              <span className="text-base text-gray-800 font-medium">{selectedSlot?.time || "N/A"}</span>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: '2px', background: '#f59e0b', width: '100%', marginBottom: '24px' }}></div>

          {/* Total Amount */}
          <div className="text-center mb-8">
            <p className="text-lg font-semibold text-gray-600 mb-2">TOTAL AMOUNT TO PAY</p>
            <p className="text-3xl font-bold" style={{ color: '#f59e0b' }}>Rs. {totalPrice}/-</p>
          </div>

          {/* Notes */}
          <div className="text-center text-sm text-gray-500 space-y-1 mb-8">
            <p className="italic">Note: Please arrive 10 mins before your time slot.</p>
            <p>Thank you for choosing Touch & Glow!</p>
          </div>

          {/* Footer */}
          <div style={{ paddingTop: '16px', borderTop: '1px solid #e5e7eb', textAlign: 'center', fontSize: '12px', color: '#999999' }}>
            <p>Booking ID: {Date.now().toString().slice(-8)}</p>
            <p style={{ marginTop: '4px' }}>Generated on: {new Date().toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>
      
      {/* Header with Logo */}
      {step < 4 && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 px-4 md:px-8 py-4 border-b shadow-sm sticky top-0 z-10">
          <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
              <div className="h-12 w-12 md:h-14 md:w-14 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center">
                <Sparkles className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold text-gray-900">Touch & Glow</h1>
                <p className="text-xs md:text-sm text-gray-600">Family Salon</p>
              </div>
            </div>
            {step > 1 && (
              <button onClick={goToPrevStep} className="p-2 rounded-lg hover:bg-yellow-100">
                <ArrowLeft size={20} />
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Progress Steps */}
      {step < 4 && (
        <div className="bg-white px-4 md:px-8 py-4 border-b shadow-sm sticky top-20 md:top-24 z-10">
          <div className="flex items-center justify-center mb-2">
            <h2 className="text-base md:text-lg font-bold text-gray-900">Book Your Appointment</h2>
          </div>
          
          <div className="flex justify-between items-center">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex flex-col items-center flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-1 ${
                  step >= s 
                    ? "bg-gradient-to-r from-yellow-500 to-yellow-600 text-white" 
                    : "bg-gray-200 text-gray-400"
                }`}>
                  {step > s ? <Check size={16} /> : s}
                </div>
                <span className="text-xs font-medium">
                  {s === 1 ? "Services" : s === 2 ? "Time" : "Details"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 1: Services Selection */}
      {step === 1 && (
        <div className="px-4 pt-6">
          {/* Gender Tabs */}
          <div className="flex bg-white p-1.5 rounded-2xl shadow mb-5 border">
            {["Male", "Female", "Kids"].map((tab) => (
              <button 
                key={tab}
                onClick={() => { setActiveTab(tab); setSelectedCategory("All"); }}
                className={`flex-1 py-3 rounded-xl text-sm font-bold ${
                  activeTab === tab 
                    ? "bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow" 
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          
          {/* Search */}
          <div className="relative mb-5">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder={`Search ${activeTab.toLowerCase()} services...`}
              className="w-full bg-white text-black py-4 pl-12 pr-4 rounded-2xl outline-none border shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-4 mb-4">
            {currentCategories.map(cat => (
              <button 
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                  selectedCategory === cat 
                    ? "bg-gradient-to-r from-yellow-500 to-yellow-600 text-white" 
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          
          {/* Services List */}
          <div className="space-y-3">
            {filteredServices.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-2xl shadow">
                <Search size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No services found</p>
                <p className="text-gray-400 text-sm mt-1">Try changing category or search</p>
              </div>
            ) : (
              filteredServices.map((service) => {
                const isSelected = cart.some(s => s.id === service.id);
                return (
                  <div 
                    key={service.id}
                    onClick={() => toggleService(service)}
                    className={`p-4 rounded-2xl border shadow-sm transition-all ${
                      isSelected 
                        ? "border-yellow-500 bg-yellow-50" 
                        : "border-gray-200 bg-white hover:border-yellow-300"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold">{service.name}</h3>
                          {isSelected && (
                            <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                              Selected
                            </span>
                          )}
                        </div>
                        {service.category && (
                          <p className="text-xs text-gray-500 font-medium mb-2">{service.category}</p>
                        )}
                        {service.duration && (
                          <p className="text-xs text-gray-600">
                            ⏱️ {service.duration} mins
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-lg">₹{service.price}</span>
                        <button className={`mt-2 px-3 py-1 rounded-lg text-sm font-medium ${
                          isSelected 
                            ? "bg-red-100 text-red-600 hover:bg-red-200" 
                            : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                        }`}>
                          {isSelected ? "Remove" : "Add"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          
          {/* Cart Summary */}
          {cart.length > 0 && (
            <div className="fixed bottom-4 left-4 right-4 bg-white rounded-2xl shadow-xl border border-gray-200 p-4">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <p className="text-sm text-gray-600">Selected Services</p>
                  <p className="font-bold">{cart.length} {cart.length === 1 ? 'service' : 'services'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="font-bold text-xl text-yellow-600">₹{totalPrice}</p>
                </div>
              </div>
              <button 
                onClick={goToNextStep}
                className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:shadow-lg transition-all"
              >
                Continue to Time Selection
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Time Selection */}
      {step === 2 && (
        <div className="px-4 pt-6">
          <div className="bg-white p-5 rounded-2xl shadow mb-6">
            <h2 className="text-xl font-bold mb-4">Select Date & Time</h2>
            
            {/* Date Selection */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="text-yellow-600" size={20} />
                <label className="font-medium">Choose Date</label>
              </div>
              <input 
                type="date" 
                value={selectedDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => { setSelectedDate(e.target.value); setSelectedSlot(null); }}
                className="w-full p-3 border rounded-xl bg-gray-50"
              />
            </div>
            
            {/* Time Slots */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="text-yellow-600" size={20} />
                <label className="font-medium">Available Time Slots</label>
              </div>
              {calculatedSlots.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="mx-auto text-gray-300 mb-3" size={40} />
                  <p className="text-gray-500">Loading slots...</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {calculatedSlots.map((slot) => (
                    <button
                      key={slot.id}
                      disabled={slot.isFull}
                      onClick={() => setSelectedSlot(slot)}
                      className={`py-3 rounded-xl text-sm font-medium transition-all ${
                        slot.isFull 
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                          : selectedSlot?.id === slot.id
                            ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {slot.time}
                      {slot.isFull && <span className="block text-xs mt-1">Full</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Next Button */}
          <div className="fixed bottom-4 left-4 right-4">
            <div className="bg-white p-4 rounded-2xl shadow-xl border">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <p className="text-sm text-gray-600">Selected Time</p>
                  <p className="font-bold">{selectedSlot ? selectedSlot.time : "Not selected"}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Services</p>
                  <p className="font-bold">{cart.length} items</p>
                </div>
              </div>
              <button 
                onClick={goToNextStep}
                disabled={!selectedSlot}
                className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 ${
                  selectedSlot 
                    ? "bg-gradient-to-r from-yellow-500 to-yellow-600 text-white hover:shadow-lg" 
                    : "bg-gray-200 text-gray-500 cursor-not-allowed"
                }`}
              >
                Continue to Details
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Customer Details */}
      {step === 3 && (
        <div className="px-4 pt-6">
          <div className="bg-white p-5 rounded-2xl shadow mb-6">
            <h2 className="text-xl font-bold mb-6">Your Details</h2>
            
            {/* Booking Summary */}
            <div className="bg-gray-50 p-4 rounded-xl mb-6">
              <h3 className="font-bold mb-2 text-gray-700">Booking Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium">{new Date(selectedDate).toLocaleDateString('en-IN', { 
                    weekday: 'short', 
                    day: 'numeric', 
                    month: 'short' 
                  })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Time:</span>
                  <span className="font-medium">{selectedSlot?.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Services:</span>
                  <span className="font-medium">{cart.length} items</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600">Total Amount:</span>
                  <span className="font-bold text-lg text-yellow-600">₹{totalPrice}</span>
                </div>
              </div>
            </div>
            
            {/* Customer Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 font-medium mb-2">Full Name *</label>
                <input 
                  type="text"
                  placeholder="Enter your full name"
                  className="w-full p-3 border rounded-xl bg-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-gray-700 font-medium mb-2">Phone Number *</label>
                <input 
                  type="tel"
                  placeholder="10-digit mobile number"
                  maxLength="10"
                  className="w-full p-3 border rounded-xl bg-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                />
                <p className="text-xs text-gray-500 mt-1">We'll send booking confirmation via WhatsApp</p>
              </div>
            </div>
          </div>
          
          {/* Booking Button */}
          <div className="fixed bottom-4 left-4 right-4">
            <div className="bg-white p-4 rounded-2xl shadow-xl border">
              <button 
                onClick={handleBooking}
                disabled={isBooking}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:shadow-lg transition-all disabled:opacity-70"
              >
                {isBooking ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Processing...
                  </>
                ) : (
                  <>
                    <Check size={20} />
                    Confirm Booking
                  </>
                )}
              </button>
              <p className="text-center text-xs text-gray-500 mt-2">
                You'll receive a beautiful image receipt
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Success Message */}
      {step === 4 && showSuccess && (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gradient-to-br from-gray-900 to-black">
          <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-md w-full text-center">
            <div className="w-24 h-24 bg-gradient-to-r from-green-500 to-green-400 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
              <Check size={48} className="text-white" />
            </div>
            
            <h1 className="text-3xl font-bold text-gray-800 mb-3">Booking Confirmed!</h1>
            <p className="text-gray-600 mb-6">
              Thank you for booking with Touch & Glow Salon
            </p>
            
            <div className="bg-gray-50 rounded-2xl p-5 mb-6">
              <h3 className="font-bold text-gray-700 mb-3">Appointment Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium">{customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium">
                    {new Date(selectedDate).toLocaleDateString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Time:</span>
                  <span className="font-medium">{selectedSlot?.time}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600">Total:</span>
                  <span className="font-bold text-green-600">₹{totalPrice}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Download className="text-yellow-600" size={20} />
                <p className="text-yellow-700 font-medium">Receipt Downloaded!</p>
              </div>
              <p className="text-sm text-yellow-600 mb-2">
                Your beautiful booking receipt has been downloaded as an image
              </p>
              <p className="text-xs text-yellow-500">
                Check your downloads folder for "TouchAndGlow_Booking_*.png"
              </p>
            </div>
            
            <p className="text-sm text-gray-500 mb-6">
              ⏰ Please arrive 10 minutes before your appointment
              <br />
              📞 Call us for any queries: +91 99 135 46386
            </p>
            
            <div className="space-y-3">
              <button 
                onClick={resetBooking}
                className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-white py-3 rounded-xl font-bold hover:shadow-lg transition-all"
              >
                Book Another Service
              </button>
              
              <div className="flex gap-3">
                <a 
                  href="tel:+919913546386"
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-gray-200"
                >
                  <Phone size={18} />
                  Call Us
                </a>
                <a 
                  href="https://wa.me/919913546386"
                  className="flex-1 bg-green-100 text-green-700 py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-green-200"
                >
                  <span className="text-lg">💬</span>
                  WhatsApp
                </a>
              </div>
            </div>
            
            <p className="text-xs text-gray-400 mt-6 pt-4 border-t">
              Auto redirecting to home in a few seconds...
            </p>
          </div>
        </div>
      )}

      {/* Bottom Navigation - Fixed for mobile */}
      {step < 4 && !cart.length && step === 1 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
          <div className="flex items-center justify-center gap-6 text-gray-600">
            <a href="/" className="flex flex-col items-center">
              <Home size={22} />
              <span className="text-xs mt-1">Home</span>
            </a>
            <a href="tel:+919913546386" className="flex flex-col items-center">
              <Phone size={22} />
              <span className="text-xs mt-1">Call</span>
            </a>
            <a href="https://maps.google.com" className="flex flex-col items-center">
              <MapPin size={22} />
              <span className="text-xs mt-1">Location</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}