const validPresets = ['approved', 'date', 'author', 'likes']
const loadingModal = $('#loading-modal').modal({
  closable: false,
  onHide: function() { addButton.removeClass('moved') },
  onShow: function() { addButton.addClass('moved') }
})
const loadingModalContent = loadingModal.find('.header')
const aboutModal = $('#about-modal').modal({
  onHide: function() { addButton.removeClass('moved') },
  onShow: function() { addButton.addClass('moved') }
})
const logoutBtn = $('#logout')
const userAvatarDialog = $('#user-avatar')
const addForm = $('.ui.form')
const addFormModal = $('#add-new-dialog.ui.modal').modal({ autofocus: false })
const addFormSubmit = $('#add-new-submit')
const addButton = $('#add-new')
const ignInput = $('#ign-input')
const titleInput = $('#title-input')
const screenshotInput = $('#screenshot-input')
const totalEntryCount = $('#total-entry-count')
const totalUpvoteCount = $('#total-upvote-count')
const topEntryContainer = $('#top-entry')
const gallery = $('#gallery')
const $filterPresetDropdown = $('#filter-preset').dropdown({
  onChange: function(val) { filterByPreset(val); console.log(val) }
})
let authorFilterDir = 1
let likesFilterDir = 1
let approvalFilterDir = 1
let dateFilterDir = 1
const $filterAuthorDropdown = $('#filter-author').dropdown({
  sortSelect: true,
  onChange: function(val) { filterByAuthor() },
})
const $filterAuthorDropdownList = $filterAuthorDropdown.find('select')
const recentlyAdded = $('#recently-added')
const modalCache = {}
const cardCache = {}
const cardFullContainer = []
let cardFilteredContainer = []
const authorContainer = []
const screenshotInputName = $('input:text', screenshotInput.parent())
let topUpvotes = 0
let itemsPerPage = -1
let currentPage = 0
let user = undefined
let loggedIn = false

function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

function changeStatus(status, id) {
  if (!user.councillor) return
  send(`/resources/${status === 'approved' ? 'approveentry' : status === 'denied' ? 'denyentry' : 'pendingentry'}`, {id: id}, function(success) {
    if (!success) return
    // const modal = $(`[data-target='${id}'].ui.modal`)
    const modal = modalCache[id]
    // const card = $(`[data-target='${id}'].gallery-card`)
    const card = cardCache[id]
    modal.find('.approve-btn').html(status === 'approved' ? 'Deny' : 'Approve')
    card.find('.upvote-container').css('display', status === 'approved' ? 'block' : 'none')
    modal.find('.upvote-btn').css('display', status === 'approved' ? 'inline-block' : 'none')
    $(`[data-target='${id}'].gallery-card .status-ribbon`).html(status === 'denied' ? '<a class="ui red right corner label"><i class="remove icon"></i></a>' : status === 'approved' ? '' : '<a class="ui orange right corner label"><i class="ellipsis horizontal icon"></i></a>')
    cardCache[id].data('status', status)
    if (status === 'approved') modalCache[id].find('.tag').remove()
    else if (status === 'denied') {
      const tag = modalCache[id].find('.tag')[0]
      if (tag) tag.removeClass('orange').addClass('red').html('Unapproved')
      else modalCache[id].find('.content.details').prepend('<div class="ui tag red label">Unapproved</div>')
    }
  })
}

function removeEntry(id) {
  id = parseInt(id, 10)
  send(`/resources/removeentry`, {id: id}, function(success) {
    if (!success) return
    for (var x in cardFullContainer) {
      if (cardFullContainer[x].data('id') === id) {
        cardFullContainer.splice(x, 1)
      }
    }
    for (var y in cardFilteredContainer) {
      if (cardFilteredContainer[x].data('id') === id) {
        cardFilteredContainer.splice(x, 1)
      }
    }
    modalCache[id].modal('hide').remove()
    totalEntryCount[0].innerHTML = parseInt(totalEntryCount[0].innerHTML, 10) - 1

    const author = cardCache[id].data('discord_name')
    let foundAuthors = 0
    for (var i in cardCache) {
      if (cardCache[i].data('discord_name') === author) ++foundAuthors
    }
    if (foundAuthors === 1) {
      for (var q = authorContainer.length - 1; q >= 0; --q) if (authorContainer[q] === author) authorContainer.splice(q, 1)
      $filterAuthorDropdownList.find(`[value="${author}"]`).remove()
    }

    cardCache[id].remove()
    delete cardCache[id]
    delete modalCache[id]

    calcTop()
  })
}

function initEntry(entry) {
  const id = entry.id
  const entryModal = $(`[data-target='${id}'].ui.modal`)
  entryModal.find('.entry-options-btn').dropdown()
  cardCache[id] = $(`[data-target="${id}"].gallery-card`)
  cardCache[id].data('upvotes', entry.upvotes)
  cardCache[id].data('discord_name', entry.discord_name)
  cardCache[id].data('link', entry.link)
  cardCache[id].data('id', entry.id)
  cardCache[id].data('status', entry.status)
  cardCache[id].data('date', entry.date)
  if (!authorContainer.includes(entry.discord_name)) {
    authorContainer.push(entry.discord_name)
    $filterAuthorDropdownList.append(`<option value="${entry.discord_name}">${entry.discord_name}</option>`)
  }
  cardFullContainer.push(cardCache[id])
  modalCache[id] = entryModal
  entryModal.modal({
    // transition: 'fade',
    // duration: 0,
    autofocus: false,
    onApprove: function() {
      if (!loggedIn) return false
      const card = cardCache[id]
      const btn = $(this).find('.upvote-btn')
      btn.addClass('disabled')
      send(`/resources/upvote`, {id: id}, function(success) {
        btn.removeClass('disabled')
        if (!success) return false
        card.addClass('upvoted')
        let upvoteCount = card.find('.upvotes')[0]
        // upvoteCount.innerHTML = parseInt(upvoteCount.innerHTML, 10) + 1
        const currentVotes = cardCache[id].data('upvotes')
        upvoteCount.innerHTML = currentVotes + 1
        cardCache[id].data('upvotes', currentVotes + 1)

        btn.removeClass('green approve').addClass('red deny')
        btn.html('-1<i class="thumbs outline down right icon"></i>')
        totalUpvoteCount[0].innerHTML = parseInt(totalUpvoteCount[0].innerHTML, 10) + 1
        calcTop()
      })
      return false
    },
    onDeny: function() {
      if (!loggedIn) return false
      const card = cardCache[id]
      const btn = $(this).find('.upvote-btn')
      btn.addClass('disabled')
      send(`/resources/downvote`, {id: id}, function(success) {
        btn.removeClass('disabled')
        if (!success) return
        card.removeClass('upvoted')
        let upvoteCount = card.find('.upvotes')[0]
        const currentVotes = cardCache[id].data('upvotes')
        cardCache[id].data('upvotes', currentVotes > 0 ? currentVotes - 1 : 0)
        upvoteCount.innerHTML = currentVotes > 0 ? currentVotes - 1 : 0
        // let count = parseInt(upvoteCount.innerHTML, 10)
        // upvoteCount.innerHTML = count > 0 ? count - 1 : 0
        btn.removeClass('red deny').addClass('green approve')
        btn.html('+1<i class="thumbs outline up right icon"></i>')
        totalUpvoteCount[0].innerHTML = parseInt(totalUpvoteCount[0].innerHTML, 10) - 1
        calcTop()
      })
      return false
    },
    onShow: function() {
      addButton.addClass('moved')
    },
    onHide: function() {
      addButton.removeClass('moved')
    }
  })
}

function showModal(id) {
  if (modalCache[id]) modalCache[id].modal('show')
}

function genCardPages(inputArray) {
  if (itemsPerPage <= 0) return []
  const cardPages = []
  let currentPage = []
  for (var p in inputArray) {
    if (currentPage.length < itemsPerPage) currentPage.push(inputArray[p])
    else cardPages.push(currentPage)
  }
  if (currentPage.length > 0) cardPages.push(currentPage)
  if (cardPages.length === 1) return []
  return cardPages
}

function refreshGallery(container) {
  container = container ? container : cardFilteredContainer.length > 0 ? cardFilteredContainer : cardFullContainer
  const cardPages = genCardPages(container)
  if (cardPages.length === 0) {
    const elem = gallery[0]
    while (elem.firstChild) { elem.removeChild(elem.firstChild) }
    gallery.append(container)
  } else {
    if (currentPage > cardPages.length - 1) currentPage = cardPages.length - 1
    const elems = cardPages[currentPage]
    const elem = gallery[0]
    while (elem.firstChild) { elem.removeChild(elem.firstChild) }
    gallery.append(elems)
  }

}

function filterByPreset(preset) {
  if (!validPresets.includes(preset)) return
  const container = cardFilteredContainer.length > 0 ? cardFilteredContainer.slice() : cardFullContainer.slice()
  container.sort(function(a, b) {
    if (preset === 'author') return authorFilterDir === 1 ? a.data('discord_name').localeCompare(b.data('discord_name')) : b.data('discord_name').localeCompare(a.data('discord_name'))
    else if (preset === 'likes') return likesFilterDir === 1 ? b.data('upvotes') - a.data('upvotes') : a.data('upvotes') - b.data('upvotes')
    else if (preset === 'approval') {
      const compare = { approved: 3, pending: 2, denied: 1 }
      return approvalFilterDir === 1 ? compare[b.data('status')] - compare[a.data('status')] : compare[a.data('status')] - compare[b.data('status')]
    } else if (preset === 'date') return dateFilterDir === 1 ? b.data('date') < a.data('date') : a.data('date') < b.data('date')
  })
  if (preset === 'author') authorFilterDir *= -1
  else if (preset === 'likes') likesFilterDir *= -1
  else if (preset === 'approval') approvalFilterDir *= -1
  else if (preset === 'date') dateFilterDir *= -1
  refreshGallery(container)
}

function filterByAuthor() {
  authors = $filterAuthorDropdown.dropdown('get value')
  const entries = cardFullContainer
  let newContainer = []
  let html = ''
  if (authors.length > 0) {
    for (var x in entries) {
      const entry = entries[x]
      if (!authors.includes(entry.data('discord_name'))) continue
      newContainer.push(entry)
    }
  } else {
    for (var y in cardFullContainer) {
      newContainer.push(cardFullContainer[y])
    }
  }
  cardFilteredContainer = newContainer
  refreshGallery(newContainer)
}

function calcTop() {
  topUpvotes = 0
  if (cardFullContainer.length === 0) {
    topEntryContainer.parent().parent().find('.summary > p').empty()
    return topEntryContainer.html('No top submission found :(')
  }
  let top = {}
  for (var id in cardCache) {
    let num = cardCache[id].data('upvotes') //parseInt(cardCache[id].find('span.upvotes')[0].innerHTML, 10)
    if (num < topUpvotes) continue
    topUpvotes = num
    top.id = id
    top.link = cardCache[id].data('link')//.find('img')[0].attr('src')
    top.discord_name = cardCache[id].data('discord_name')
  }
  if (top.link) {
    topEntryContainer.html(`<img src=${top.link} onclick="showModal(${top.id})"/ >`)
    topEntryContainer.parent().parent().find('.summary > p').html('Submitted by ' + top.discord_name)
  }
}

addForm.form({
  fields: {
    ign: {
      identifier: 'ign',
      rules: [
        {type: 'maxLength[24]', prompt: 'Your IGN must be less than 25 characters.'}
      ]
    },
    'post-title': {
      identifier: 'post-title',
      rules: [
        {type: 'maxLength[99]', prompt: 'Your title must be less than 100 characters.'}
      ]
    },
    'screenshot-input': {
      identifier: 'screenshot-input',
      rules: [{type: 'empty', prompt: `You forgot your screenshot!`}]
    }
  },
  onSuccess: function() {
    if (!screenshotInput[0].files[0]) return false
    loadingModalContent.html(`<div class="ui active centered inline massive loader"></div><h1>One moment dear...</h1>`)
    loadingModal.find('.actions').remove()
    addFormSubmit.addClass('disabled')
    loadingModal.modal('show')
    const reader = new FileReader()

    reader.readAsBinaryString(screenshotInput[0].files[0])
    reader.onload = function() {
      send('/resources/newentry', {base64: btoa(reader.result), title: titleInput.val(), ign: ignInput.val()}, function(info) {
        addFormSubmit.removeClass('disabled')
        if (info.err) {
          loadingModalContent.html(`<i class="warning circle massive red icon"></i><h1>${info.err === "invalid" ? "That's not an image, silly!" : "Uh oh. Your screenshot couldn't be uploaded!"}</h1>`)
          loadingModal.append(`<div class="actions" style="text-align: center"><div class="ui ok button basic inverted">Ok</div></div>`)
          return
        }
        loadingModal.modal('hide')
        addFormModal.modal('hide')
        totalEntryCount[0].innerHTML = parseInt(totalEntryCount[0].innerHTML, 10) + 1

        gallery.css('opacity', 0)
        recentlyAdded.prepend(info.recent)

        setTimeout(function() {
          gallery.append(info.card)
          initEntry(info.entry)
          refreshGallery()
          gallery.css('opacity', 1)
        }, 500)


      })
    }
    reader.onerror = function(err) {
      console.log(err)
    }
    return false
  },
  inline: true
})

$('#about-btn').click(function() {
  aboutModal.modal('show')
})

$('.ui.file.input').find('input:text, .ui.button').on('click', function() {
    screenshotInput.click();
})


screenshotInput.on('change', function(e) {
  let file = $(e.target);
  let name = e.target.files[0].name;
	screenshotInputName.val(name);
})

addFormModal.modal({
  onHidden: function() {
    addForm[0].reset()
  },
  onHide: function() {
    addButton.removeClass('moved')
  },
  onShow: function() {
    addButton.addClass('moved')
  }
})

addButton.on('click', function() {
  if (!loggedIn) return console.log('here')
  addFormModal.modal('show')
})

addFormSubmit.on('click', function() {
  addForm.submit()
})



send('/resources/discord', null, function(info) {
  if (!info) return;
  $(userAvatarDialog.find('img')[0]).attr('src', info.avatarURL)
  logoutBtn.html('Log Out<i class="sign out large icon"></i>').removeClass('login').addClass('logout')
  userAvatarDialog.popup({
    inline: true,
    on: 'click',
    html: `<div id="user-info">
            <img src="/${info.clan === 'Deus Ex Tempus' ? 'tempusemblem.png' : info.clan === 'Deus Ex Incendium' ? 'incendiumemblem.png' : 'allianceemblem.png'}"/>
            <div>
              <h4 data-type="discord-name">${info.username}</h4>
              ${info.councillor ? '<h5 style="margin: 0; color: #FE9A76">Councillor</h5>' : ''}
              <h5 data-type="discord-clan" style="margin: 0">${info.clan}</h5>
              <h5 data-type="discord-id" style="margin: 0">${info.id}</h5>
            </div>
          </div>`,
    variation: 'inverted'
  })

  userAvatarDialog.css('display', 'inline-block')
  user = info
})

logoutBtn.on('click', function() {
  if (logoutBtn.hasClass('logout')) {
    send('/logout', null, function(info) {
      logoutBtn.html('Log In<i class="sign in large icon"></i>').removeClass('logout').addClass('login')
      userAvatarDialog.css('display', 'none')
      loggedIn = false
      user = undefined
      for (var id in modalCache) {
        modalCache[id].find('.upvote-btn').popup({hoverable: true, html: `You must be <a style="cursor: pointer;" onclick="logoutBtn.click()">logged in</a> to vote`})
      }
      addButton.popup({hoverable: true, html: `You must be <a style="cursor: pointer;" onclick="logoutBtn.click()">logged in</a> to add a submission`})
      addButton.css('cursor', 'not-allowed')
      $('.entry-options-btn').hide()
    }, {type: 'GET'})
  } else window.location.href = '/login'
})

send('/resources/getentries', null, function(info) {
  if (!info) return console.log(info)
  if (!info.loggedIn) {
    $('.upvote-btn').popup({hoverable: true, html: `You must be <a style="cursor: pointer"  onclick="logoutBtn.click()">logged in</a> to vote`})
    addButton.popup({hoverable: true, html: `You must be <a style="cursor: pointer" onclick="logoutBtn.click()">logged in</a> to add a submission`})
    addButton.css('cursor', 'not-allowed')
  }
  else loggedIn = true

  if (!info.html) return console.log('no html')

  gallery.hide()
  gallery.append(info.html)
  const entries = info.entries
  for (var x in entries) initEntry(entries[x])
  const cardPages = genCardPages(cardFullContainer)

  const requestedCard = getParameterByName('id')
  if (requestedCard) showModal(requestedCard)

  if (cardPages.length > 0 && Array.isArray(cardPages[0])) {
    gallery.detach()
    const elems = cardPages[currentPage]
    for (var i in elems) gallery.append(elems[i][0])
  }
  gallery.show()
  totalEntryCount.html(info.entryCount)
  totalUpvoteCount.html(info.upvoteCount)
  const topEntry = info.topEntry
  if (topEntry.link) {
    topUpvotes = topEntry.upvotes
    topEntryContainer.html(`<img src=${topEntry.link} onclick="showModal(${topEntry.id})"/ >`)
    topEntryContainer.parent().parent().find('.summary > p').html('Submitted by ' + topEntry.discord_name)
  }

  new Clipboard('.share-btn', {
    text: function(trigger) {
      const getUrl = window.location;
      const baseUrl = getUrl .protocol + "//" + getUrl.host + "/" + getUrl.pathname.split('/')[1];
      return baseUrl + '?id=' + trigger.getAttribute('data-target')

    }
  })
  recentlyAdded.append(info.recentHTML)

  const pastFilters = $filterAuthorDropdown.dropdown('get value')
  if (pastFilters.length > 0) filterByAuthor(pastFilters)

})

$(document).on('click', '.approve-btn', function() {
  if (this.innerHTML === 'Deny') changeStatus('denied', $(this).attr('data-target'))
  else changeStatus('approved', $(this).attr('data-target'))
})

$(document).on('click', '.remove-btn', function() {
  removeEntry($(this).attr('data-target'))
})
