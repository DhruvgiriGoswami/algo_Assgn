// src/App.js
import React, { useState, useEffect } from 'react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
} from 'date-fns';

function App() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [holidays, setHolidays] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showListModal, setShowListModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [holidayName, setHolidayName] = useState('');
  const [selectedDayHolidays, setSelectedDayHolidays] = useState([]);

  // Fetch holidays when the component mounts
  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    try {
      const res = await fetch('http://localhost:8080/holidays');
      const data = await res.json();
      setHolidays(data || []);
    } catch (err) {
      console.error('Error fetching holidays:', err);
      setHolidays([]);
    }
  };

  const openAddModal = (date) => {
    setSelectedDate(date);
    setHolidayName('');
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
  };

  const addHoliday = async () => {
    if (!holidayName || !selectedDate) return;
    const holidayData = {
      date: format(selectedDate, 'dd/MM/yyyy'),
      name: holidayName,
    };

    try {
      const res = await fetch('http://localhost:8080/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(holidayData),
      });
      if (res.ok) {
        await fetchHolidays();
        closeAddModal();
      } else {
        console.error('Error adding holiday');
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const deleteHoliday = async (id) => {
    try {
      const res = await fetch(`http://localhost:8080/holidays/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchHolidays();
        // Also update the selected day holidays in case the list modal is open
        if (selectedDate) {
          openHolidayList(selectedDate);
        }
      } else {
        console.error('Error deleting holiday');
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  // Open the holiday list modal for a specific day
  const openHolidayList = (date) => {
    const dayStr = format(date, 'dd/MM/yyyy');
    const filtered = holidays.filter((h) => h.date === dayStr);
    setSelectedDayHolidays(filtered);
    setSelectedDate(date);
    setShowListModal(true);
  };

  const closeListModal = () => {
    setShowListModal(false);
  };

  // Render the header with month navigation
  const renderHeader = () => {
    return (
      <div className="flex justify-between items-center py-4">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="bg-blue-500 text-white px-3 py-1 rounded"
        >
          Prev
        </button>
        <h2 className="text-xl font-bold">{format(currentMonth, 'MMMM yyyy')}</h2>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="bg-blue-500 text-white px-3 py-1 rounded"
        >
          Next
        </button>
      </div>
    );
  };

  // Render each cell of the calendar
  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const currentDay = day; // Capture current day
        const displayDay = format(currentDay, 'd');

        // Filter holidays for this day using dd/MM/yyyy format
        const holidaysForDay = holidays.filter(
          (h) => h.date === format(currentDay, 'dd/MM/yyyy')
        );

        days.push(
          <div
            key={currentDay.toString()}
            className="border p-2 h-24 relative group cursor-pointer"
            // On clicking the cell (if it has holidays), open the holiday list modal
            onClick={() => {
              if (holidaysForDay.length > 0) openHolidayList(currentDay);
            }}
          >
            <span>{displayDay}</span>
            {/* If there are holidays, display an icon/count */}
            {holidaysForDay.length > 0 && (
              <div className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {holidaysForDay.length}
              </div>
            )}
            {/* Button to add holiday on hover */}
            <button
              className="absolute bottom-1 right-1 bg-green-500 text-white text-xs px-1 py-0.5 hidden group-hover:block"
              onClick={(e) => {
                // Prevent cell click event
                e.stopPropagation();
                openAddModal(currentDay);
              }}
            >
              Add Holiday
            </button>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div key={day.toString()} className="grid grid-cols-7 gap-1">
          {days}
        </div>
      );
      days = [];
    }
    return <div className="mt-4">{rows}</div>;
  };

  return (
    <div className="container mx-auto p-4">
      {renderHeader()}
      {renderCells()}

      {/* Modal for adding a holiday */}
      {showAddModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50">
          <div className="bg-white p-6 rounded shadow-lg">
            <h3 className="text-xl mb-4">
              Add Holiday for {format(selectedDate, 'dd/MM/yyyy')}
            </h3>
            <input
              type="text"
              placeholder="Holiday Name"
              className="border p-2 w-full mb-4"
              value={holidayName}
              onChange={(e) => setHolidayName(e.target.value)}
            />
            <div className="flex justify-end">
              <button
                onClick={closeAddModal}
                className="mr-2 bg-gray-500 text-white px-3 py-1 rounded"
              >
                Cancel
              </button>
              <button
                onClick={addHoliday}
                className="bg-blue-500 text-white px-3 py-1 rounded"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for viewing holidays on a day */}
      {showListModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50">
          <div className="bg-white p-6 rounded shadow-lg max-w-sm w-full">
            <h3 className="text-xl mb-4">
              Holidays for {format(selectedDate, 'dd/MM/yyyy')}
            </h3>
            <ul className="mb-4">
              {selectedDayHolidays.map((holiday) => (
                <li key={holiday.id} className="flex justify-between items-center">
                  <span>{holiday.name}</span>
                  <button
                    className="text-red-500"
                    onClick={() => deleteHoliday(holiday.id)}
                  >
                    &times;
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex justify-end">
              <button
                onClick={closeListModal}
                className="bg-gray-500 text-white px-3 py-1 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
