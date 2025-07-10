// DOM elements
const tabs = document.querySelectorAll(".tab");
const tabContents = document.querySelectorAll('.tab-content');
let currentTab = 'personal';

// Constants for max loan periods and interest rates
const MAX_LOAN_PERIODS = {
    personal: 120, // 10 years
    home: 360,     // 30 years
    car: 84        // 7 years
};

const INTEREST_RATES = {
    personal: { min: 15, max: 25 },
    home: { min: 10, max: 15 },
    car: { min: 10, max: 25 }
};

// --- Initialization ---
initializeCalculator();

function initializeCalculator() {
    // Set up tab switching logic
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabType = tab.getAttribute('data-tab');
            switchTab(tabType);
            clearAllErrors(tabType); // Clear errors when switching tabs
            resetResultsDisplay(tabType); // Reset UI results on tab switch
            updatePieChart(0, 0); // Reset chart
            document.getElementById('chartEmi').textContent = formatCurrency(0); // Reset chart EMI display
        });
    });

    // Set up calculate and reset buttons
    ['personal', 'home', 'car'].forEach(tabType => {
        document.getElementById(`${tabType}-calculate-btn`).addEventListener('click', () => {
            calculateAndUpdateChart(tabType); // This function will now handle all validation and calculation
        });
        document.getElementById(`${tabType}-reset-btn`).addEventListener('click', () => {
            resetButton(tabType);
        });
    });

    // Set up real-time input validations
    setupInputValidations();

    // Initial setup for the default tab
    switchTab(currentTab);
    resetResultsDisplay(currentTab);
    updatePieChart(0, 0);
    document.getElementById('chartEmi').textContent = formatCurrency(0);
}

// --- Tab Switching Logic ---
function switchTab(tabType) {
    currentTab = tabType;

    tabs.forEach(tab => {
        tab.classList.toggle('active', tab.getAttribute('data-tab') === tabType);
    });

    tabContents.forEach(content => {
        content.classList.toggle('active', content.id === tabType);
    });
}

// --- Validation Functions ---

// Main validation function to be called on "Calculate EMI" click
function validateAllFields(tabType) {
    let isValid = true; // Overall flag for validity

    // Get all relevant input elements for the current tab
    const principalField = document.getElementById(`${tabType}-principal`);
    const rateField = document.getElementById(`${tabType}-rate`);
    const yearsField = document.getElementById(`${tabType}-years`);
    const monthsField = document.getElementById(`${tabType}-months`);
    const downPaymentField = document.getElementById(`${tabType}-downpayment`);
    // NEW: Get the dedicated error container for time-related errors
    const dedicatedTimeErrorContainer = document.getElementById(`${tabType}-time-error-container`);


    // Validate Principal
    let principal = parseFloat(principalField.value);
    if (!isNaN(principal)) {
        principal = Math.round(principal); // Round principal on calculate
        principalField.value = principal;
    }

    if (principalField.value.trim() === "" || isNaN(principal) || principal <= 0) {
        showError(principalField, "⚠️Principal must be a positive whole number.");
        isValid = false;
    } else {
        clearError(principalField);
    }

    // Validate Rate
    const rate = parseFloat(rateField.value);
    const { min: rateMin, max: rateMax } = INTEREST_RATES[tabType];
    if (rateField.value.trim() === "" || isNaN(rate) || rate < rateMin || rate > rateMax) {
        showError(rateField, `⚠️Rate must be between ${rateMin}% and ${rateMax}%.`);
        isValid = false;
    } else {
        clearError(rateField);
    }

    // Validate Down Payment (if applicable)
    if (tabType !== 'personal') {
        let downPayment = parseFloat(downPaymentField.value);
        if (!isNaN(downPayment)) {
            downPayment = Math.round(downPayment); // Round down payment on calculate
            downPaymentField.value = downPayment;
        }

        if (downPaymentField.value.trim() === "" || isNaN(downPayment) || downPayment < 0 || downPayment > principal) {
            showError(downPaymentField, "⚠️Down payment must be a whole number between 0 and principal amount.");
            isValid = false;
        } else {
            clearError(downPaymentField);
        }
    }

    // Validate Years
    const years = parseFloat(yearsField.value); // Use parseFloat here to check for decimals
    if (yearsField.value.trim() === "" || isNaN(years) || years < 0) {
        showError(yearsField, "⚠️Years of loan is required and must be non-negative.");
        isValid = false;
    } else if (years % 1 !== 0) { // Check for decimal
        showError(yearsField, "⚠️Years cannot be a decimal value.");
        isValid = false;
    } else {
        clearError(yearsField);
    }

    // Validate Months
    const months = parseFloat(monthsField.value); // Use parseFloat here to check for decimals
    if (monthsField.value.trim() === "" || isNaN(months) || months < 0 || months >= 12) {
        showError(monthsField, "⚠️Months must be between 0 and 11.");
        isValid = false;
    } else if (months % 1 !== 0) { // Check for decimal
        showError(monthsField, "⚠️Months cannot be a decimal value.");
        isValid = false;
    } else {
        clearError(monthsField);
    }

    // Validate Years and Months combined (cannot be 0 and 0)
    // Only perform this check if individual year/month parsing was successful AND they are integers
    if (isValid && (yearsField.value.trim() !== "" && years % 1 === 0) && (monthsField.value.trim() !== "" && months % 1 === 0) && years === 0 && months === 0) {
        showError(monthsField, "⚠️Loan period cannot be 0 years and 0 months.");
        isValid = false;
    } else if (isValid) {
        // Ensure to clear the specific combined error if it was previously set
        let combinedZeroErrorDiv = monthsField.parentNode.querySelector(".error");
        if (combinedZeroErrorDiv && combinedZeroErrorDiv.textContent === "⚠️Loan period cannot be 0 years and 0 months.") {
            clearError(monthsField);
        }
    }


    // Validate Total Loan Period against max allowed
    const totalMonths = (parseInt(yearsField.value) || 0) * 12 + (parseInt(monthsField.value) || 0); // Use parseInt for total calculation
    const maxAllowedMonths = MAX_LOAN_PERIODS[tabType];
    const timeGroupElement = yearsField.closest('.time-inputs'); // Keeping this line as requested

    // Clear previous max period error for the dedicated container
    let existingMaxError = dedicatedTimeErrorContainer.querySelector(".error");
    if (existingMaxError && existingMaxError.textContent.includes("loan period cannot exceed")) {
        clearErrorForElement(dedicatedTimeErrorContainer); // Use the new helper function
    }

    if (isValid && totalMonths > maxAllowedMonths) {
        // Show error in the dedicated container, not the timeGroupElement
        showErrorInContainer(dedicatedTimeErrorContainer, `⚠️${tabType.charAt(0).toUpperCase() + tabType.slice(1)} loan period cannot exceed ${maxAllowedMonths / 12} years.`);
        isValid = false;
    } else {
        // Ensure to clear the dedicated error message if valid now
        clearErrorForElement(dedicatedTimeErrorContainer);
    }

    return isValid;
}

// --- Calculation and UI Update Logic ---

// Function for calculating and updating the chart (main entry point for EMI calculation)
function calculateAndUpdateChart(tabType) {
    // Clear all existing errors before running new validation
    clearAllErrors(tabType);

    // Validate all fields. If validation fails, stop.
    if (!validateAllFields(tabType)) {
        resetResultsDisplay(tabType);
        updatePieChart(0, 0);
        document.getElementById('chartEmi').textContent = formatCurrency(0);
        return;
    }

    // If all validations pass, proceed with calculation
    const principal = parseFloat(document.getElementById(`${tabType}-principal`).value);
    const rate = parseFloat(document.getElementById(`${tabType}-rate`).value);
    let downPayment = 0;
    if (tabType !== 'personal') {
        downPayment = parseFloat(document.getElementById(`${tabType}-downpayment`).value);
    }
    const years = parseInt(document.getElementById(`${tabType}-years`).value); // Use parseInt for calculation
    const months = parseInt(document.getElementById(`${tabType}-months`).value); // Use parseInt for calculation

    // Calculate loan amount (principal - down payment)
    const loanAmount = principal - downPayment;

    // Calculate total months
    const totalMonths = (years * 12) + months;

    // Calculate monthly interest rate
    const monthlyRate = (rate / 12) / 100;

    // Calculate EMI
    let emi = 0;
    if (loanAmount > 0 && totalMonths > 0 && monthlyRate > 0) {
        const numerator = loanAmount * monthlyRate * Math.pow(1 + monthlyRate, totalMonths);
        const denominator = Math.pow(1 + monthlyRate, totalMonths) - 1;
        emi = numerator / denominator;
    } else if (loanAmount > 0 && totalMonths > 0 && monthlyRate === 0) { // Special case for 0% interest
        emi = loanAmount / totalMonths;
    }

    // Calculate total payment and interest
    const totalPayment = emi * totalMonths;
    const totalInterest = totalPayment - loanAmount;

    // Update UI with calculated values
    document.getElementById(`${tabType}-emi`).textContent = formatCurrency(emi);
    document.getElementById(`${tabType}-totalprincipal`).textContent = formatCurrency(loanAmount);
    document.getElementById(`${tabType}-totalinterest`).textContent = formatCurrency(totalInterest);
    document.getElementById(`${tabType}-totalamount`).textContent = formatCurrency(totalPayment);

    // If this is the current tab, update the chart EMI display
    if (currentTab === tabType) {
        document.getElementById('chartEmi').textContent = formatCurrency(emi);
    }
    updatePieChart(loanAmount, totalInterest); // Update the pie chart
    animateResults(tabType); // Animate the results section
}

// --- Formatting and Chart Functions ---

// Format currency values
function formatCurrency(value) {
    if (isNaN(value) || value === null) {
        return '₹0';
    }
    const number = Math.round(value); // Round to nearest whole number
    const formatter = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });
    return formatter.format(number);
}

// Update pie chart based on principal and interest values
function updatePieChart(principal, interest) {
    const total = principal + interest;
    const chart = document.querySelector('.pie-chart');

    if (total <= 0) {
        document.getElementById('principal-percentage').textContent = "0.0%";
        document.getElementById('interest-percentage').textContent = "0.0%";
        chart.style.background = `conic-gradient(rgba(232, 237, 250, 0.9) 0deg 360deg)`; // Default to principal color if no values
        return;
    }

    // Calculate percentages
    const principalPercent = (principal / total) * 100;
    const interestPercent = (interest / total) * 100;

    // Update percentage text
    document.getElementById('principal-percentage').textContent = principalPercent.toFixed(1) + '%';
    document.getElementById('interest-percentage').textContent = interestPercent.toFixed(1) + '%';

    // Convert percentages to degrees for the arc
    const interestDegrees = (interestPercent / 100) * 360;

    // For the donut style, we'll use conic-gradient
    chart.style.background = `conic-gradient(
        rgba(82, 109, 254, 0.9) 0deg ${interestDegrees}deg,
        rgba(232, 237, 250, 0.9) ${interestDegrees}deg 360deg
    )`;
}

// Function to animate results when updated
function animateResults(tabType) {
    const resultValues = document.querySelectorAll(`#${tabType} .result-value`);

    resultValues.forEach(value => {
        value.classList.remove('updated');
        void value.offsetWidth; // Trigger reflow
        value.classList.add('updated');
    });

    // Animate pie chart
    const pieChart = document.querySelector('.pie-chart');
    if (pieChart) {
        pieChart.style.animation = 'pulse 0.5s ease';
        setTimeout(() => {
            pieChart.style.animation = '';
        }, 500);
    }
}

// --- Error Handling Functions ---

// Shows an error message next to the input field
function showError(element, message) {
    let existingError = element.parentNode.querySelector(".error");
    if (existingError) {
        existingError.textContent = message;
    } else {
        let errorMessage = document.createElement("div");
        errorMessage.textContent = message;
        errorMessage.classList.add('error');
        element.parentNode.appendChild(errorMessage);
    }
    element.classList.add('input-error'); // Add a class for styling
}

// Clears an error message
function clearError(element) {
    let errorMessage = element.parentNode.querySelector(".error");
    if (errorMessage) {
        errorMessage.remove();
    }
    element.classList.remove('input-error'); // Remove error styling
}

// NEW: Shows an error message in a specified container
function showErrorInContainer(containerElement, message) {
    let existingError = containerElement.querySelector(".error");
    if (existingError) {
        existingError.textContent = message;
    } else {
        let errorMessage = document.createElement("div");
        errorMessage.textContent = message;
        errorMessage.classList.add('error');
        containerElement.appendChild(errorMessage);
    }
    // No .input-error class added to container itself, as it's not an input
}

// NEW: Clears an error message from a specified container
function clearErrorForElement(containerElement) {
    let errorMessage = containerElement.querySelector(".error");
    if (errorMessage) {
        errorMessage.remove();
    }
    // No .input-error class removed, as it's not an input
}


// Clears all error messages for a specific tab
function clearAllErrors(tabType) {
    document.querySelectorAll(`#${tabType} .error`).forEach(errorDiv => {
        errorDiv.remove();
    });
    document.querySelectorAll(`#${tabType} .input-error`).forEach(inputField => {
        inputField.classList.remove('input-error');
    });
    // NEW: Also explicitly clear the dedicated time error container
    const dedicatedTimeErrorContainer = document.getElementById(`${tabType}-time-error-container`);
    if (dedicatedTimeErrorContainer) {
        clearErrorForElement(dedicatedTimeErrorContainer);
    }
}

// --- Reset Functions ---

// Resets the calculated EMI results display for a tab
function resetResultsDisplay(tabType) {
    document.getElementById(`${tabType}-emi`).textContent = formatCurrency(0);
    document.getElementById(`${tabType}-totalprincipal`).textContent = formatCurrency(0);
    document.getElementById(`${tabType}-totalinterest`).textContent = formatCurrency(0);
    document.getElementById(`${tabType}-totalamount`).textContent = formatCurrency(0);
    document.getElementById('chartEmi').textContent = formatCurrency(0); // Ensure chart EMI display is also reset
}

// Resets all inputs and results for a tab
function resetButton(tabType) {
    document.getElementById(`${tabType}-principal`).value = "";
    document.getElementById(`${tabType}-rate`).value = "";
    if (tabType !== 'personal') {
        document.getElementById(`${tabType}-downpayment`).value = "";
    }
    document.getElementById(`${tabType}-years`).value = "";
    document.getElementById(`${tabType}-months`).value = "";

    clearAllErrors(tabType); // Clear all errors on reset
    resetResultsDisplay(tabType); // Reset calculation display
    updatePieChart(0, 0); // Reset pie chart
}

// --- Real-time Input Validation Setup ---

// This function sets up event listeners for real-time validation feedback (not for calculation trigger)
function setupInputValidations() {
    ['personal', 'home', 'car'].forEach(tabType => {
        const principalField = document.getElementById(`${tabType}-principal`);
        const rateField = document.getElementById(`${tabType}-rate`);
        const yearsField = document.getElementById(`${tabType}-years`);
        const monthsField = document.getElementById(`${tabType}-months`);
        const downPaymentField = document.getElementById(`${tabType}-downpayment`);
        // NEW: Get the dedicated error container for time-related errors
        const dedicatedTimeErrorContainer = document.getElementById(`${tabType}-time-error-container`);


        // Helper to validate a single field on input (shows immediate errors)
        // Modified to handle numeric-only validation and required check on blur
        const validateFieldOnInput = (field, validationCheck, errorMessage, isDecimalAllowed = true) => {
            field.addEventListener('input', () => {
                let value = field.value.trim();
                let sanitizedValue = isDecimalAllowed ? value.replace(/[^\d.]/g, '') : value.replace(/[^\d]/g, '');

                if (value !== sanitizedValue) {
                    field.value = sanitizedValue; // Update the field to remove invalid characters
                    showError(field, `⚠️Only ${isDecimalAllowed ? 'numeric' : 'whole number'} input is allowed.`);
                    return; // Stop further validation for this input event
                } else {
                    // Clear the numeric-only error if it was previously shown and input is now valid
                    const existingNumError = field.parentNode.querySelector(".error");
                    if (existingNumError && existingNumError.textContent.includes("Only numeric input is allowed.")) {
                        clearError(field);
                    }
                }

                if (sanitizedValue === "") {
                    clearError(field); // Clear any existing error if field becomes empty
                    return;
                }

                const numValue = parseFloat(sanitizedValue);
                if (!validationCheck(numValue)) {
                    showError(field, errorMessage);
                } else {
                    clearError(field);
                }
            });
            // Also check on blur to catch empty required fields
            field.addEventListener('blur', () => {
                if (field.value.trim() === "") {
                    showError(field, "⚠️This field is required.");
                }
            });
        };

        // Principal validation (with auto-rounding on blur)
        principalField.addEventListener('input', () => {
            let value = principalField.value.trim();
            let sanitizedValue = value.replace(/[^\d.]/g, ''); // Allow digits and one decimal
            if (value !== sanitizedValue) {
                principalField.value = sanitizedValue;
                showError(principalField, "⚠️Only numeric input is allowed.");
                return;
            } else {
                clearError(principalField);
            }
            if (sanitizedValue === "") {
                clearError(principalField);
                return;
            }
            let numValue = parseFloat(sanitizedValue);
            if (isNaN(numValue) || numValue <= 0) {
                showError(principalField, "⚠️Principal must be a positive number.");
            } else {
                clearError(principalField);
            }
        });
        principalField.addEventListener('blur', () => {
            let value = principalField.value.trim();
            if (value === "") {
                showError(principalField, "⚠️This field is required.");
            } else {
                let numValue = parseFloat(value);
                if (!isNaN(numValue)) {
                    principalField.value = Math.round(numValue); // Round on blur
                    clearError(principalField);
                } else {
                    showError(principalField, "⚠️Principal must be a positive whole number.");
                }
            }
        });

        // Rate validation
        const { min: rateMin, max: rateMax } = INTEREST_RATES[tabType];
        validateFieldOnInput(rateField, value => !isNaN(value) && value >= rateMin && value <= rateMax, `⚠️Rate must be between ${rateMin}% and ${rateMax}%.`);

        // Downpayment validation (if applicable - with auto-rounding on blur)
        if (tabType !== 'personal') {
            downPaymentField.addEventListener('input', () => {
                let value = downPaymentField.value.trim();
                let sanitizedValue = value.replace(/[^\d.]/g, ''); // Allow digits and one decimal
                if (value !== sanitizedValue) {
                    downPaymentField.value = sanitizedValue;
                    showError(downPaymentField, "⚠️Only numeric input is allowed.");
                    return;
                } else {
                    clearError(downPaymentField);
                }
                if (sanitizedValue === "") {
                    clearError(downPaymentField);
                    return;
                }
                let numValue = parseFloat(sanitizedValue);
                const currentPrincipal = parseFloat(principalField.value) || 0;
                if (isNaN(numValue) || numValue < 0 || numValue > currentPrincipal) {
                    showError(downPaymentField, "⚠️Down payment must be a non-negative number less than or equal to principal.");
                } else {
                    clearError(downPaymentField);
                }
            });
            downPaymentField.addEventListener('blur', () => {
                let value = downPaymentField.value.trim();
                if (value === "") {
                    showError(downPaymentField, "⚠️This field is required.");
                } else {
                    let numValue = parseFloat(value);
                    if (!isNaN(numValue)) {
                        downPaymentField.value = Math.round(numValue); // Round on blur
                        clearError(downPaymentField);
                    } else {
                        showError(downPaymentField, "⚠️Down payment must be a whole number between 0 and principal amount.");
                    }
                }
            });

            // Add an additional listener to principal to re-validate downpayment if principal changes
            principalField.addEventListener('input', () => {
                if (downPaymentField.value.trim() !== "") { // Only re-validate if downpayment has a value
                    const dpValue = parseFloat(downPaymentField.value);
                    const currentPrincipal = parseFloat(principalField.value) || 0;
                    if (!isNaN(dpValue) && dpValue >= 0 && dpValue > currentPrincipal) {
                        showError(downPaymentField, "⚠️Down payment must be less than or equal to principal amount.");
                    } else {
                        clearError(downPaymentField);
                    }
                }
            });
        }

        // Years validation (numeric-only and whole number)
        validateFieldOnInput(yearsField, value => !isNaN(value) && value >= 0 && value % 1 === 0, "⚠️Years of loan must be a non-negative whole number.", false);
        yearsField.addEventListener('blur', () => {
            if (yearsField.value.trim() === "") {
                showError(yearsField, "⚠️This field is required.");
            }
        });

        // Months validation (numeric-only and whole number)
        validateFieldOnInput(monthsField, value => !isNaN(value) && value >= 0 && value < 12 && value % 1 === 0, "⚠️Months must be a whole number between 0 and 11.", false);
        monthsField.addEventListener('blur', () => {
            if (monthsField.value.trim() === "") {
                showError(monthsField, "⚠️This field is required.");
            }
        });

        // Combined Years and Months (0 and 0) real-time validation
        const validateYearsAndMonthsCombined = () => {
            const yearsValue = parseInt(yearsField.value);
            const monthsValue = parseInt(monthsField.value);

            const isYearsZero = yearsField.value.trim() !== "" && !isNaN(yearsValue) && yearsValue === 0;
            const isMonthsZero = monthsField.value.trim() !== "" && !isNaN(monthsValue) && monthsValue === 0;

            // Clear the specific combined zero error message if it was previously set
            let combinedZeroErrorDiv = monthsField.parentNode.querySelector(".error");
            if (combinedZeroErrorDiv && combinedZeroErrorDiv.textContent === "⚠️Loan period cannot be 0 years and 0 months.") {
                clearError(monthsField);
            }

            if (isYearsZero && isMonthsZero) {
                showError(monthsField, "⚠️Loan period cannot be 0 years and 0 months.");
            }
        };

        yearsField.addEventListener('input', validateYearsAndMonthsCombined);
        monthsField.addEventListener('input', validateYearsAndMonthsCombined);
        yearsField.addEventListener('blur', validateYearsAndMonthsCombined);
        monthsField.addEventListener('blur', validateYearsAndMonthsCombined);

        // Total loan period max limit real-time validation
        const validateTotalTimePeriodOnInput = () => {
            const years = parseInt(yearsField.value) || 0;
            const months = parseInt(monthsField.value) || 0;
            const totalMonths = (years * 12) + months;
            const maxAllowedMonths = MAX_LOAN_PERIODS[tabType];

            // Retain this line as requested:
            // const timeGroupElement = yearsField.closest('.time-inputs');

            // Clear previous max period error for this specific container
            let existingMaxError = dedicatedTimeErrorContainer.querySelector(".error");
            if (existingMaxError && existingMaxError.textContent.includes("loan period cannot exceed")) {
                clearErrorForElement(dedicatedTimeErrorContainer);
            }

            if (totalMonths > maxAllowedMonths) {
                // Show error in the dedicated container
                showErrorInContainer(dedicatedTimeErrorContainer, `⚠️${tabType.charAt(0).toUpperCase() + tabType.slice(1)} loan period cannot exceed ${maxAllowedMonths / 12} years.`);
            } else {
                // Ensure to clear this specific error if conditions become valid
                clearErrorForElement(dedicatedTimeErrorContainer);
            }
        };

        yearsField.addEventListener('input', validateTotalTimePeriodOnInput);
        monthsField.addEventListener('input', validateTotalTimePeriodOnInput);
        yearsField.addEventListener('blur', validateTotalTimePeriodOnInput);
        monthsField.addEventListener('blur', validateTotalTimePeriodOnInput);
    });
}