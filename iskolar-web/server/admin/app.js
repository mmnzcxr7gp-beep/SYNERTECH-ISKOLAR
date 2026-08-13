  try {
    // Try both student and provider endpoints depending on which exists; use student reject endpoint as fallback
    const url = backendBase + `/admin/verification/${id}/reject-student`;
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type':'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ rejectionReason: reason }) });
    if (!res.ok) throw new Error('Reject failed');
    await loadVerifications();
    closeVerificationModal();
  } catch (e) {
    console.error(e);
    alert(e.message || 'Reject failed');
  }
}

// On load, if token exists try to load
if (getToken()) {
  loadOverview().then(() => { show(dashboardEl); hide(loginEl); switchSection('overviewSection'); }).catch(() => { clearToken(); });
}

