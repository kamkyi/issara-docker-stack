import type { Dispatch, SetStateAction } from "react";
import { showToast } from "$src/components/toast/toastUtil";

/**
 * Generic handler for deleting items from a list
 * @param index - Index of item to delete
 * @param currentList - Current array of items
 * @param setList - State setter for the list
 * @param setCompanyData - State setter for company data
 * @param itemName - Name of item type (e.g., "Contact", "Address") for toast message
 */
export const createDeleteHandler = <T extends Record<string, any>>(
	itemName: string,
) => {
	return (
		index: number,
		currentList: T[],
		setList: Dispatch<SetStateAction<T[]>>,
		setCompanyData: Dispatch<SetStateAction<any>>,
		companyDataField: string,
	) => {
		const updated = currentList.filter((_, i) => i !== index);
		setList(updated);
		setCompanyData((prev: any) => ({
			...prev,
			[companyDataField]: updated,
		}));
		showToast.info(`${itemName} removed - don't forget to save your changes`);
	};
};

/**
 * Generic handler for adding items to a list with validation
 * @param newItem - Item to add
 * @param currentList - Current array of items
 * @param setList - State setter for the list
 * @param setCompanyData - State setter for company data
 * @param setNewItem - State setter to reset the form
 * @param initialState - Initial state for new item (for reset)
 * @param itemName - Name of item type for toast message
 * @param validator - Optional validation function
 */
export const createAddHandler = <T extends Record<string, any>>(
	itemName: string,
	validator?: (item: T) => { valid: boolean; message?: string },
) => {
	return (
		newItem: T,
		currentList: T[],
		setList: Dispatch<SetStateAction<T[]>>,
		setCompanyData: Dispatch<SetStateAction<any>>,
		setNewItem: Dispatch<SetStateAction<T>>,
		initialState: T,
		companyDataField: string,
		transformItem?: (item: T) => any,
	) => {
		// Run validation if provided
		if (validator) {
			const validation = validator(newItem);
			if (!validation.valid) {
				showToast.warning(validation.message || `Invalid ${itemName}`);
				return false;
			}
		}

		const itemToAdd = transformItem ? transformItem(newItem) : newItem;
		const updatedList = [...currentList, itemToAdd];

		setList(updatedList);
		setCompanyData((prev: any) => ({
			...prev,
			[companyDataField]: updatedList,
		}));
		setNewItem(initialState);
		showToast.info(`${itemName} added - don't forget to save your changes`);
		return true;
	};
};

/**
 * Default validators for common items
 */
export const validators = {
	contact: (item: any) => {
		if (!item.first_name || !item.last_name) {
			return {
				valid: false,
				message: "First name and last name are required",
			};
		}
		return { valid: true };
	},

	address: (item: any) => {
		if (!item.street || !item.country_id) {
			return {
				valid: false,
				message: "Street and country are required",
			};
		}
		return { valid: true };
	},
};

/**
 * Default transformers for common items
 */
export const transformers = {
	contact: (item: any) => ({
		translation: {
			first_name: item.first_name,
			last_name: item.last_name,
			position: item.position,
		},
		email: item.email,
		phone_number: item.phone_number,
	}),
};
