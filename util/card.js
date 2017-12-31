module.exports = function (entry, discord) {
  const hasPerm = discord && (entry.discord_id === discord.id || discord.councillor)

  return `
  <div class="gallery-card card${entry.upvoted ? ' upvoted' : ''}" data-target="${entry.id}" onclick="showModal(${entry.id})">

        <div class="ui basic gallery-modal large modal transition" data-target="${entry.id}">
          <div class="header">
            ${entry.title}
            <div class="ui icon top left pointing dropdown orange button entry-options-btn" ${hasPerm ? '' : 'style="display: none"'}>
              <i class="settings icon"></i>
              <div class="menu">
                <div class="header">Post Actions</div>
                <div class="item approve-btn" data-target="${entry.id}" ${discord && discord.councillor ? '' : 'style="display: none"'}>${entry.status !== 'approved' ? 'Approve' : 'Deny'}</div>
                <div class="item remove-btn" data-target="${entry.id}" ${hasPerm ? '' : 'style="display: none"'}>Remove</div>
              </div>
            </div>


          </div>
          <div class="scrolling image content">
            <div class="ui image" style="position: relative;">
              <img src="${entry.link}">
            </div>
          </div>
          <div class="content details">
            ${entry.status === 'approved' ? '' : entry.status === 'pending' ? '<div class="ui tag orange label">Pending Approval</div>' : '<div class="ui tag red label">Unapproved</div>'}
            <p class="modal-author">Submitted by ${entry.discord_name} ${entry.ign ? '(IGN: ' + entry.ign + ')': ''}</p>
          </div>
            <div class="actions">
            <a class="ui icon button" href="${entry.link}" style="float: left" target="_blank">
              <i class="external icon"></i>
            </a>
            <a class="ui button share-btn" style="float: left" data-target="${entry.id}" data-clipboard-text="${entry.id}" data-tooltip="Copy Link" data-inverted="">
              Share
            </a>
            <div class="ui button close" onclick="$(\`[data-target='${entry.id}'].ui.modal\`).modal('hide')">
              Close
            </div>
              <div class="ui right labeled icon ${entry.upvoted ? 'red deny' : 'green approve'} button upvote-btn" data-target="${entry.id}" style="display: ${entry.status !== 'approved' ? 'none"' : 'inline-block"'}>
                ${entry.upvoted ? '-1' : '+1'}
                <i class="${entry.upvoted ? 'thumbs outline down' : 'thumbs outline up'} right icon"></i>
              </div>

            </div>
        </div>



        <div class="image status-ribbon" style='background-image: url("${entry.link}"); background-size: cover;")'>
          ${entry.status === 'pending' ? '<a class="ui orange right corner label"><i class="ellipsis horizontal icon"></i></a>' : entry.status === 'denied' ? '<a class="ui red right corner label"><i class="remove icon"></i></a>' : ''}

        </div>
        <div class="extra content like-display">
          <span class="right floated upvote-container" style="display: ${entry.status !== 'approved' ? 'none' : 'block'}"><i class="heart icon"></i><span class="upvotes">${entry.upvotes}</span></span>
          <span style="overflow: hidden;word-wrap: break-word;">${entry.discord_name}</span>
        </div>
      </div>`
}
