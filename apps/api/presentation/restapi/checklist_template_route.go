package restapi

import (
	"net/http"

	"github.com/gorilla/mux"
)

type ChecklistTemplateRouter struct {
	handler ChecklistTemplateHandler
}

func NewChecklistTemplateRouter(handler ChecklistTemplateHandler) ChecklistTemplateRouter {
	return ChecklistTemplateRouter{handler: handler}
}

func (r ChecklistTemplateRouter) AddRouter(router *mux.Router) {
	router.HandleFunc("/checklist-templates", CheckAuth(r.handler.GetChecklistTemplateList)).Methods(http.MethodGet)
	router.HandleFunc("/checklist-templates", CheckAuth(r.handler.CreateChecklistTemplate)).Methods(http.MethodPost, http.MethodOptions)
	router.HandleFunc("/checklist-templates/{checklistTemplateId}", CheckAuth(r.handler.GetChecklistTemplateById)).Methods(http.MethodGet)
	router.HandleFunc("/checklist-templates/{checklistTemplateId}", CheckAuth(r.handler.UpdateChecklistTemplateById)).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/checklist-templates/{checklistTemplateId}", CheckAuth(r.handler.DeleteChecklistTemplateById)).Methods(http.MethodDelete)
}
