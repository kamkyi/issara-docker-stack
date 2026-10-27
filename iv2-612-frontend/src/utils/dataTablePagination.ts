import type { GridPaginationModel } from "@mui/x-data-grid";

export const resetPageWhenPageSizeChanges = (
	currentModel: GridPaginationModel,
	nextModel: GridPaginationModel,
): GridPaginationModel => {
	if (nextModel.pageSize === currentModel.pageSize) {
		return nextModel;
	}

	return {
		...nextModel,
		page: 0,
	};
};

export const clampPaginationModelToRowCount = (
	model: GridPaginationModel,
	rowCount: number,
): GridPaginationModel => {
	const maxPage = Math.max(0, Math.ceil(rowCount / model.pageSize) - 1);

	if (model.page <= maxPage) {
		return model;
	}

	return {
		...model,
		page: maxPage,
	};
};
