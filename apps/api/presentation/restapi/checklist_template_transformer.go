package restapi

import (
	"apps/api/domain"
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

func GetChecklistTemplateId(r *http.Request) (int64, error) {
	vars := mux.Vars(r)
	idParam := vars["checklistTemplateId"]
	id, err := strconv.ParseInt(idParam, 10, 64)
	return id, err
}

func GetChecklistTemplateRequest(r *http.Request) (apiContract.ChecklistTemplateRequest, error) {
	var req apiContract.ChecklistTemplateRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	return req, err
}

func ToApiChecklistTemplateSubItem(d domain.ChecklistTemplateSubItem) apiContract.ChecklistTemplateSubItem {
	return apiContract.ChecklistTemplateSubItem{
		Id:           d.Id,
		Name:         d.Name,
		DisplayOrder: d.DisplayOrder,
		CreatedAt:    d.CreatedAt,
		UpdatedAt:    d.UpdatedAt,
	}
}

func ToApiChecklistTemplateItem(d domain.ChecklistTemplateItem) apiContract.ChecklistTemplateItem {
	subItems := []apiContract.ChecklistTemplateSubItem{}
	for _, si := range d.SubItems {
		subItems = append(subItems, ToApiChecklistTemplateSubItem(si))
	}
	return apiContract.ChecklistTemplateItem{
		Id:           d.Id,
		Name:         d.Name,
		Description:  d.Description,
		DisplayOrder: d.DisplayOrder,
		SubItems:     subItems,
		CreatedAt:    d.CreatedAt,
		UpdatedAt:    d.UpdatedAt,
	}
}

func ToApiChecklistTemplate(d domain.ChecklistTemplate) apiContract.ChecklistTemplate {
	items := []apiContract.ChecklistTemplateItem{}
	for _, item := range d.Items {
		items = append(items, ToApiChecklistTemplateItem(item))
	}
	return apiContract.ChecklistTemplate{
		Id:          d.Id,
		Name:        d.Name,
		Description: d.Description,
		Items:       items,
		CreatedAt:   d.CreatedAt,
		UpdatedAt:   d.UpdatedAt,
	}
}

func ToChecklistTemplateSubItem(req apiContract.ChecklistTemplateSubItemRequest) domain.ChecklistTemplateSubItem {
	var id int64
	// if req.Id != nil {
	// 	id = *req.Id
	// }
	return domain.ChecklistTemplateSubItem{
		Id:           id,
		Name:         req.Name,
		DisplayOrder: req.DisplayOrder,
	}
}

func ToChecklistTemplateItem(req apiContract.ChecklistTemplateItemRequest) domain.ChecklistTemplateItem {
	var id int64
	// if req.Id != nil {
	// 	id = *req.Id
	// }
	subItems := []domain.ChecklistTemplateSubItem{}
	for _, si := range req.SubItems {
		subItems = append(subItems, ToChecklistTemplateSubItem(si))
	}
	return domain.ChecklistTemplateItem{
		Id:           id,
		Name:         req.Name,
		Description:  req.Description,
		DisplayOrder: req.DisplayOrder,
		SubItems:     subItems,
	}
}

func ToChecklistTemplate(req apiContract.ChecklistTemplateRequest) domain.ChecklistTemplate {
	items := []domain.ChecklistTemplateItem{}
	for _, item := range req.Items {
		items = append(items, ToChecklistTemplateItem(item))
	}
	return domain.ChecklistTemplate{
		Name:        req.Name,
		Description: req.Description,
		Items:       items,
	}
}
