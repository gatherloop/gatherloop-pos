package restapi

import (
	"net/http"

	"github.com/gorilla/mux"
)

type ChecklistSessionRouter struct {
	handler ChecklistSessionHandler
}

func NewChecklistSessionRouter(handler ChecklistSessionHandler) ChecklistSessionRouter {
	return ChecklistSessionRouter{handler: handler}
}

func (r ChecklistSessionRouter) AddRouter(router *mux.Router) {
	router.HandleFunc("/checklist-sessions", CheckAuth(r.handler.CreateChecklistSession)).Methods(http.MethodPost, http.MethodOptions)
	router.HandleFunc("/checklist-sessions/{checklistSessionId}", CheckAuth(r.handler.GetChecklistSessionById)).Methods(http.MethodGet)
	router.HandleFunc("/checklist-sessions/{checklistSessionId}", CheckAuth(r.handler.DeleteChecklistSessionById)).Methods(http.MethodDelete)
	router.HandleFunc("/checklist-session-items/{checklistSessionItemId}/check", CheckAuth(r.handler.CheckSessionItem)).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/checklist-session-items/{checklistSessionItemId}/uncheck", CheckAuth(r.handler.UncheckSessionItem)).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/checklist-session-sub-items/{checklistSessionSubItemId}/check", CheckAuth(r.handler.CheckSessionSubItem)).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/checklist-session-sub-items/{checklistSessionSubItemId}/uncheck", CheckAuth(r.handler.UncheckSessionSubItem)).Methods(http.MethodPut, http.MethodOptions)
}
