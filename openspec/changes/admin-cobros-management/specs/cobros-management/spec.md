## ADDED Requirements

### Requirement: Manual rent payment registration

The system SHALL provide an interface for administrators to manually register rent payments received from real estate agents.

#### Scenario: Successful payment registration
- **WHEN** administrator accesses `/admin/cobros` and selects a property
- **AND** enters payment amount and date
- **AND** confirms the registration
- **THEN** the system SHALL create a new `CobroAlquiler` record with:
  - Property ID from selection
  - Payment amount as entered
  - Payment date as entered
  - Period calculated as YYYY-MM from payment date
  - Status set to "PENDIENTE"
  - `montoBruto` set to payment amount
  - `montoNeto` calculated as `montoBruto - gastosTotal`

#### Scenario: Payment with previous amount suggestion
- **WHEN** administrator selects a property with existing payment history
- **AND** the system detects previous payments for the same property
- **THEN** the system SHALL suggest the last payment amount as default value
- **AND** the administrator SHALL be able to modify the suggested amount

#### Scenario: Property selection without payments
- **WHEN** administrator selects a property with no payment history
- **THEN** the system SHALL display empty payment amount field
- **AND** SHALL not show amount suggestions

### Requirement: Monthly variation calculation

The system SHALL automatically calculate payment variations between consecutive months for each property.

#### Scenario: Positive variation
- **WHEN** a payment is registered for a property that had a payment in the previous month
- **AND** current payment amount > previous payment amount
- **THEN** the system SHALL calculate variation as: `((current - previous) / previous) * 100`
- **AND** SHALL display variation percentage with "+" indicator
- **AND** SHALL display variation amount in currency format

#### Scenario: Negative variation
- **WHEN** current payment amount < previous payment amount
- **AND** there was a payment in the previous month
- **THEN** the system SHALL calculate variation as: `((current - previous) / previous) * 100`
- **AND** SHALL display variation percentage with "-" indicator
- **AND** SHALL display variation amount in currency format

#### Scenario: First payment
- **WHEN** a payment is registered for a property with no previous payment history
- **THEN** the system SHALL display "First payment" instead of variation
- **AND** SHALL not calculate variation percentage

### Requirement: Delinquency detection

The system SHALL automatically detect delinquent properties based on payment history.

#### Scenario: Property becomes delinquent
- **WHEN** a property has no payment registered for the current period (YYYY-MM)
- **AND** the property had previous payment history
- **THEN** the system SHALL mark the property as "MORA" (delinquent)
- **AND** SHALL display delinquency status prominently in the property list
- **AND** SHALL calculate delinquency rate as: `(delinquent properties / total properties) * 100`

#### Scenario: Property becomes current
- **WHEN** a property has a payment registered for the current period
- **THEN** the system SHALL mark the property as "PAGADO" (current)
- **AND** SHALL remove delinquency status

#### Scenario: Multiple properties delinquency analysis
- **WHEN** displaying the properties overview
- **THEN** the system SHALL show:
  - Total number of properties
  - Number of current properties
  - Number of delinquent properties
  - Overall delinquency rate percentage

### Requirement: Payment history tracking

The system SHALL maintain complete payment history for each property.

#### Scenario: Property payment history
- **WHEN** administrator selects a specific property
- **AND** requests payment history
- **THEN** the system SHALL display all payments for that property:
  - Payment date
  - Payment amount
  - Period (YYYY-MM)
  - Status (PENDIENTE, DISTRIBUIDO, FACTURADO)
  - Calculated variation for each payment (except first)
  - Sorted by date in descending order

#### Scenario: Period filtering
- **WHEN** administrator requests payment history
- **AND** applies date range filters
- **THEN** the system SHALL filter payments within the specified date range
- **AND** SHALL update all calculations and statistics based on filtered results

### Requirement: Integration with expenses

The system SHALL integrate with existing expenses module for net amount calculations.

#### Scenario: Net amount calculation
- **WHEN** a payment is registered for a property
- **AND** there are recorded expenses for the same period
- **THEN** the system SHALL:
  - Calculate total expenses for the property's period
  - Set `gastosTotal` field to calculated expense total
  - Calculate `montoNeto` as `montoBruto - gastosTotal`
  - Display both gross and net amounts in payment details

#### Scenario: Expense deduction
- **WHEN** expenses are recorded for a property's payment period
- **AND** payment status changes to "DISTRIBUIDO"
- **THEN** the system SHALL automatically deduct expenses from the gross payment amount
- **AND** SHALL update the net amount available for distribution

### Requirement: Current account management by owner

The system SHALL maintain a current account balance for each property owner.

#### Scenario: Current account credit on payment
- **WHEN** a payment is registered and distributed to owners
- **THEN** the system SHALL credit each owner's current account:
  - Credit amount = owner_percentage × (payment_amount - total_expenses)
  - Update owner's available balance immediately
  - Record transaction with payment reference

#### Scenario: Current account debit on expense
- **WHEN** an expense is recorded for a property
- **AND** the expense is distributed to owners
- **THEN** the system SHALL debit each owner's current account:
  - Debit amount = owner_percentage × expense_amount
  - Update owner's available balance immediately
  - Record transaction with expense reference

#### Scenario: Current account balance display
- **WHEN** administrator requests owner account information
- **THEN** the system SHALL display:
  - Current available balance in ARS
  - Transaction history with credits and debits
  - Last updated timestamp
  - Calculation breakdown: (total_credits - total_debits)

#### Scenario: Multiple properties owner balance
- **WHEN** an owner has multiple properties
- **THEN** the system SHALL aggregate balances across all properties:
  - Total available balance = sum of all property-specific balances
  - Separate transaction history by property
  - Show contribution of each property to total balance

### Requirement: Currency handling

The system SHALL handle all monetary values in Argentine Pesos (ARS).

#### Scenario: Payment amount display
- **WHEN** displaying any monetary amount in the interface
- **THEN** the system SHALL:
  - Use "$" symbol (representing ARS)
  - Format with 2 decimal places
  - Include "ARS" in tooltips or detailed views

#### Scenario: Currency conversion
- **WHEN** importing or exporting data
- **THEN** the system SHALL maintain all values in ARS
- **AND** SHALL NOT perform any currency conversion

### Requirement: PDF export functionality

The system SHALL generate PDF reports with payment distribution details.

#### Scenario: Property payment summary PDF
- **WHEN** administrator requests PDF export for a specific period
- **THEN** the system SHALL generate a PDF containing:
  - Property address and identification
  - Total amount collected in ARS
  - Breakdown of distribution by owner
  - Each owner's percentage and amount in ARS
  - Period covered (YYYY-MM format)
  - Generation timestamp

#### Scenario: Multiple properties PDF
- **WHEN** requesting PDF for multiple properties
- **THEN** the system SHALL include:
  - Summary table with all properties
  - Individual property sections
  - Grand total of all collections
  - Owner totals across all properties
  - Professional formatting with headers

#### Scenario: PDF with expense deductions
- **WHEN** generating PDF for a period with recorded expenses
- **THEN** the system SHALL show:
  - Gross amounts collected per property
  - Total expenses deducted per property
  - Net amounts available for distribution
  - Final owner allocations after expenses
  - Clear separation between gross and net figures

#### Scenario: PDF download and storage
- **WHEN** PDF is generated successfully
- **THEN** the system SHALL:
  - Provide immediate download option
  - Include filename with period and date
  - Store PDF temporarily for repeated downloads
  - Format filename as: "cobros_YYYYMM.pdf"

#### Scenario: PDF with date range filtering
- **WHEN** administrator requests PDF with custom date range
- **THEN** system SHALL:
  - Filter payments within specified date range
  - Generate PDF with filtered data only
  - Include date range in filename: "cobros_YYYYMMDD_to_YYYYMMDD.pdf"
  - Allow suggestion of complete month as default option

#### Scenario: PDF with complete month suggestion
- **WHEN** accessing PDF export interface
- **THEN** system SHALL:
  - Suggest current complete month as default date range
  - Allow modification of start/end dates
  - Show preview of data that will be included
  - Display estimated number of records for selected range

### Requirement: Manual distribution registration

The system SHALL allow manual registration of direct payments to owners.

#### Scenario: Manual distribution registration
- **WHEN** administrator needs to record a direct payment to an owner
- **THEN** system SHALL provide interface to:
  - Select owner from dropdown
  - Enter payment amount in ARS
  - Add reference or reason for distribution
  - Record transaction immediately in current account
  - Update owner's available balance

#### Scenario: Distribution with reference
- **WHEN** registering a manual distribution
- **AND** it relates to a specific rent collection
- **THEN** system SHALL:
  - Link to original payment record
  - Show remaining balance after distribution
  - Allow notes for distribution purpose
  - Maintain audit trail of all distributions

#### Scenario: Current account impact
- **WHEN** a manual distribution is recorded
- **THEN** system SHALL:
  - Credit owner's current account immediately
  - Update all balance calculations
  - Reflect change in owner's transaction history
  - Maintain persistent balance across periods
