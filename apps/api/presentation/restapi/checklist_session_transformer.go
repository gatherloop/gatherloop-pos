package restapi

import (
	"apps/api/domain"
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

func GetChecklistSessionId(r *http.Request) (int64, error) {
	vars := mux.Vars(r)
	idParam := vars["checklistSessionId"]
	id, err := strconv.ParseInt(idParam, 10, 64)
	return id, err
}

func GetChecklistSessionItemId(r *http.Request) (int64, error) {
	vars := mux.Vars(r)
	idParam := vars["checklistSessionItemId"]
	id, err := strconv.ParseInt(idParam, 10, 64)
	return id, err
}

func GetChecklistSessionSubItemId(r *http.Request) (int64, error) {
	vars := mux.Vars(r)
	idParam := vars["checklistSessionSubItemId"]
	id, err := strconv.ParseInt(idParam, 10, 64)
	return id, err
}

func GetChecklistSessionRequest(r *http.Request) (apiContract.ChecklistSessionRequest, error) {
	var req apiContract.ChecklistSessionRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	return req, err
}

func ToApiChecklistSessionSubItem(d domain.ChecklistSessionSubItem) apiContract.ChecklistSessionSubItem {
	return apiContract.ChecklistSessionSubItem{
		Id:                         d.Id,
		ChecklistSessionItemId:     d.ChecklistSessionItemId,
		ChecklistTemplateSubItemId: d.ChecklistTemplateSubItemId,
		Name:                       d.Name,
		DisplayOrder:               d.DisplayOrder,
		CompletedAt:                d.CompletedAt,
		CreatedAt:                  d.CreatedAt,
		UpdatedAt:                  d.UpdatedAt,
	}
}

func ToApiChecklistSessionItem(d domain.ChecklistSessionItem) apiContract.ChecklistSessionItem {
	subItems := []apiContract.ChecklistSessionSubItem{}
	for _, si := range d.SubItems {
		subItems = append(subItems, ToApiChecklistSessionSubItem(si))
	}
	return apiContract.ChecklistSessionItem{
		Id:                      d.Id,
		ChecklistSessionId:      d.ChecklistSessionId,
		ChecklistTemplateItemId: d.ChecklistTemplateItemId,
		Name:                    d.Name,
		Description:             d.Description,
		DisplayOrder:            d.DisplayOrder,
		CompletedAt:             d.CompletedAt,
		SubItems:                subItems,
		CreatedAt:               d.CreatedAt,
		UpdatedAt:               d.UpdatedAt,
	}
}

func ToApiChecklistSession(d domain.ChecklistSession) apiContract.ChecklistSession {
	items := []apiContract.ChecklistSessionItem{}
	for _, item := range d.Items {
		items = append(items, ToApiChecklistSessionItem(item))
	}

	var apiTemplate *apiContract.ChecklistTemplate
	if d.ChecklistTemplate != nil {
		t := ToApiChecklistTemplate(*d.ChecklistTemplate)
		apiTemplate = &t
	}

	return apiContract.ChecklistSession{
		Id:                  d.Id,
		ChecklistTemplateId: d.ChecklistTemplateId,
		ChecklistTemplate:   apiTemplate,
		Date:                d.Date,
		CompletedAt:         d.CompletedAt,
		Items:               items,
		CreatedAt:           d.CreatedAt,
		UpdatedAt:           d.UpdatedAt,
		DeletedAt:           d.DeletedAt,
	}
}

func ToChecklistSession(req apiContract.ChecklistSessionRequest) domain.ChecklistSession {
	return domain.ChecklistSession{
		ChecklistTemplateId: req.ChecklistTemplateId,
		Date:                req.Date,
	}
}
