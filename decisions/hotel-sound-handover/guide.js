'use strict';
(() => {
  const byId = id => document.getElementById(id);
  const fields = ['issue', 'owner', 'coverage', 'consequence'];
  const routes = {
    pending: ['Answers changed — check the route again.', 'The previous recommendation no longer applies. Use “Show the next route” to review these answers.'],
    observe: ['Establish the problem before commissioning work.', 'Record one recent decision, its consequence and the present approach. If the arrangement works, keep it. Unknown information does not justify a purchase.'],
    evidence: ['Establish the consequence before considering a paid brief.', 'Record the actual frequency, staff intervention time, complaints or conflicting instructions. If there is no meaningful recurring consequence, keep observing rather than commission additional work. Do not assume a financial benefit.'],
    keep: ['Keep the working arrangement.', 'Use the existing team and supplier. Retain an exception owner and a way to restore approved settings; an additional review may add no value.'],
    provider: ['Ask the current team or supplier first.', 'Request a demonstration of the relevant playlist, schedule or control change within your present service. Confirm the remaining gap before considering another brief.'],
    owner: ['Identify the responsible operator.', 'Establish who owns the room’s daily operation and who can approve a change. A project partner is not automatically the budget owner.'],
    independent: ['Consider a bounded independent decision review.', 'You report a documented, meaningful recurring consequence, a responsible operator and a specific decision left open after checking the existing team or supplier. Bring the actual evidence to the brief scope; these answers do not verify value, buying authority, budget, willingness to pay, rights or contracting readiness.'],
    specialist: ['Use an appropriately qualified specialist.', 'Noise measurement, room treatment and equipment design require the relevant acoustic or technical expertise. The Atmosphere Decision Brief does not replace that work.']
  };
  function render(key) {
    const result = byId('route-result');
    result.querySelector('h3').textContent = routes[key][0];
    result.querySelector('p').textContent = routes[key][1];
    result.dataset.route = key;
  }
  function show() {
    const issue = byId('issue').value, owner = byId('owner').value, coverage = byId('coverage').value;
    const consequence = byId('consequence').value;
    let key = 'observe';
    if (issue === 'acoustics') key = 'specialist';
    else if (issue === 'working' || coverage === 'yes') key = 'keep';
    else if (issue === 'configuration') key = 'provider';
    else if (issue === 'operating') key = owner !== 'yes' ? 'owner' : coverage !== 'no' ? 'provider' : consequence !== 'documented' ? 'evidence' : 'independent';
    render(key);
  }
  byId('check-controls').hidden = false;
  byId('check-fallback').hidden = true;
  byId('check-button').addEventListener('click', show);
  for (const id of fields) byId(id).addEventListener('change', () => render('pending'));
  byId('reset-check').addEventListener('click', () => {
    for (const id of fields) byId(id).selectedIndex = 0;
    show();
    byId('issue').focus();
  });
})();
